import { Cluster, Command, Redis } from 'ioredis';
import { uniq } from 'lodash';
import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { catchAclError } from 'src/utils';
import { IFindRedisClientInstanceByOptions } from 'src/modules/redis/redis.service';
import {
  CreateRedisearchIndexDto,
  ListRedisearchIndexesResponse,
  SearchRedisearchDto,
} from 'src/modules/browser/dto/redisearch';
import { GetKeysWithDetailsResponse } from 'src/modules/browser/dto';
import { plainToClass } from 'class-transformer';
import { BrowserToolService } from '../browser-tool/browser-tool.service';

@Injectable()
export class RedisearchService {
  private logger = new Logger('RedisearchService');

  constructor(
    private browserTool: BrowserToolService,
  ) {}

  /**
   * Get list of all available redisearch indexes
   * @param clientOptions
   */
  public async list(clientOptions: IFindRedisClientInstanceByOptions): Promise<ListRedisearchIndexesResponse> {
    this.logger.log('Getting all redisearch indexes.');

    try {
      const client = await this.browserTool.getRedisClient(clientOptions);

      const nodes = this.getShards(client);

      const res = await Promise.all(nodes.map(async (node) => node.sendCommand(
        new Command('FT._LIST', [], { replyEncoding: 'hex' }),
      )));

      return plainToClass(ListRedisearchIndexesResponse, {
        indexes: (uniq([].concat(...res))).map((idx) => Buffer.from(idx, 'hex')),
      });
    } catch (e) {
      this.logger.error('Failed to get redisearch indexes', e);

      throw catchAclError(e);
    }
  }

  /**
   * Creates redisearch index
   * @param clientOptions
   * @param dto
   */
  public async createIndex(
    clientOptions: IFindRedisClientInstanceByOptions,
    dto: CreateRedisearchIndexDto,
  ): Promise<void> {
    this.logger.log('Creating redisearch index.');

    try {
      const {
        index, type, prefixes, fields,
      } = dto;

      const client = await this.browserTool.getRedisClient(clientOptions);

      try {
        const indexInfo = await client.sendCommand(new Command('FT.INFO', [dto.index], {
          replyEncoding: 'utf8',
        }));

        if (indexInfo) {
          this.logger.error(
            `Failed to create redisearch index. ${ERROR_MESSAGES.REDISEARCH_INDEX_EXIST}`,
          );
          return Promise.reject(
            new ConflictException(ERROR_MESSAGES.REDISEARCH_INDEX_EXIST),
          );
        }
      } catch (error) {
        if (!error.message?.includes('Unknown Index name')) {
          throw error;
        }
      }

      const nodes = this.getShards(client);

      const commandArgs: any[] = [
        index, 'ON', type,
      ];

      if (prefixes && prefixes.length) {
        commandArgs.push('PREFIX', prefixes.length, ...prefixes);
      }

      commandArgs.push(
        'SCHEMA', ...[].concat(...fields.map((field) => ([field.name, field.type]))),
      );

      const command = new Command('FT.CREATE', commandArgs, {
        replyEncoding: 'utf8',
      });

      await Promise.all(nodes.map(async (node) => {
        try {
          await node.sendCommand(command);
        } catch (e) {
          if (!e.message.includes('MOVED')) {
            throw e;
          }
        }
      }));

      return undefined;
    } catch (e) {
      this.logger.error('Failed to create redisearch index', e);

      throw catchAclError(e);
    }
  }

  /**
   * Search for key names using RediSearch module
   * Response is the same as for keys "scan" to have the same behaviour in the browser
   * @param clientOptions
   * @param dto
   */
  public async search(
    clientOptions: IFindRedisClientInstanceByOptions,
    dto: SearchRedisearchDto,
  ): Promise<GetKeysWithDetailsResponse> {
    this.logger.log('Searching keys using redisearch.');

    try {
      const {
        index, query, offset, limit,
      } = dto;

      const client = await this.browserTool.getRedisClient(clientOptions);

      const [total, ...keyNames] = await client.sendCommand(
        new Command('FT.SEARCH', [index, query, 'NOCONTENT', 'LIMIT', offset, limit]),
      );

      return plainToClass(GetKeysWithDetailsResponse, {
        cursor: limit + offset,
        total,
        scanned: keyNames.length + offset,
        keys: keyNames.map((name) => ({ name })),
      });
    } catch (e) {
      this.logger.error('Failed to search keys using redisearch index', e);

      throw catchAclError(e);
    }
  }

  /**
   * Get array of shards (client per each master node)
   * for STANDALONE will return array with a single shard
   * @param client
   * @private
   */
  private getShards(client: Redis | Cluster): Redis[] {
    if (client instanceof Cluster) {
      return client.nodes('master');
    }

    return [client];
  }
}
