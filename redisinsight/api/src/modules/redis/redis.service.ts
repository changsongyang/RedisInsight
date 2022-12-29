import { Injectable, Logger } from '@nestjs/common';
import { ConnectionOptions } from 'tls';
import Redis, { RedisOptions, Cluster } from 'ioredis';
import {
  find, findIndex, isEmpty, isNil, omitBy, remove,
} from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import apiConfig from 'src/utils/config';
import { CONNECTION_NAME_GLOBAL_PREFIX } from 'src/constants';
import { IRedisClusterNodeAddress } from 'src/models/redis-cluster';
import { ConnectionType } from 'src/modules/database/entities/database.entity';
import { Database } from 'src/modules/database/models/database';
import { cloneClassInstance } from 'src/utils';
import { ClientContext, ClientMetadata } from 'src/common/models';

const REDIS_CLIENTS_CONFIG = apiConfig.get('redis_clients');

export interface IRedisClientInstance {
  databaseId: string;
  context: ClientContext;
  uniqueId: string;
  client: any;
  lastTimeUsed: number;
}

@Injectable()
export class RedisService {
  private logger = new Logger('RedisService');

  private lastClientsSync: number;

  public clients: IRedisClientInstance[] = [];

  constructor() {
    this.lastClientsSync = Date.now();
  }

  public async createStandaloneClient(
    database: Database,
    appTool: ClientContext,
    useRetry: boolean,
    connectionName: string = CONNECTION_NAME_GLOBAL_PREFIX,
  ): Promise<Redis> {
    const config = await this.getRedisConnectionConfig(database);

    return await new Promise((resolve, reject) => {
      try {
        const connection = new Redis({
          ...config,
          showFriendlyErrorStack: true,
          maxRetriesPerRequest: REDIS_CLIENTS_CONFIG.maxRetriesPerRequest,
          connectionName,
          retryStrategy: useRetry ? this.retryStrategy : () => undefined,
          db: config.db > 0 && !database.sentinelMaster ? config.db : 0,
        });
        connection.on('error', (e): void => {
          this.logger.error('Failed connection to the redis database.', e);
          reject(e);
        });
        connection.on('ready', (): void => {
          this.logger.log('Successfully connected to the redis database');
          resolve(connection);
        });
        connection.on('reconnecting', (): void => {
          this.logger.log('Reconnecting to the redis database');
        });
      } catch (e) {
        reject(e);
      }
    }) as Redis;
  }

  public async createClusterClient(
    database: Database,
    nodes: IRedisClusterNodeAddress[] = [],
    useRetry: boolean = false,
    connectionName: string = CONNECTION_NAME_GLOBAL_PREFIX,
  ): Promise<Cluster> {
    const config = await this.getRedisConnectionConfig(database);
    return new Promise((resolve, reject) => {
      try {
        const cluster = new Redis.Cluster([{
          host: database.host,
          port: database.port,
        // }].concat(nodes), {
        }].concat([]), {
          clusterRetryStrategy: useRetry ? this.retryStrategy : () => undefined,
          slotsRefreshTimeout: REDIS_CLIENTS_CONFIG.clusterSlotsRefreshTimeout,
          dnsLookup: REDIS_CLIENTS_CONFIG.clusterDNSLookup
            ? (address, callback) => callback(null, address)
            : () => undefined,
          redisOptions: {
            ...config,
            showFriendlyErrorStack: true,
            maxRetriesPerRequest: REDIS_CLIENTS_CONFIG.maxRetriesPerRequest,
            connectionName,
          },
        });
        cluster.on('error', (e): void => {
          this.logger.error('Failed connection to the redis oss cluster', e);
          reject(!isEmpty(e.lastNodeError) ? e.lastNodeError : e);
        });
        cluster.on('ready', (): void => {
          this.logger.log('Successfully connected to the redis oss cluster.');
          resolve(cluster);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  public async createSentinelClient(
    database: Database,
    sentinels: Array<{ host: string; port: number }>,
    appTool: ClientContext,
    useRetry: boolean = false,
    connectionName: string = CONNECTION_NAME_GLOBAL_PREFIX,
  ): Promise<Redis> {
    const {
      username, password, sentinelMaster, tls, db,
    } = database;
    const config: RedisOptions = {
      sentinels,
      name: sentinelMaster.name,
      sentinelUsername: username,
      sentinelPassword: password,
      db,
      username: sentinelMaster?.username,
      password: sentinelMaster?.password,
    };

    if (tls) {
      const tlsConfig = await this.getTLSConfig(database);
      config.tls = tlsConfig;
      config.sentinelTLS = tlsConfig;
      config.enableTLSForSentinelMode = true;
    }
    return new Promise((resolve, reject) => {
      try {
        const client = new Redis({
          ...config,
          showFriendlyErrorStack: true,
          maxRetriesPerRequest: REDIS_CLIENTS_CONFIG.maxRetriesPerRequest,
          connectionName,
          retryStrategy: useRetry ? this.retryStrategy : () => undefined,
          sentinelRetryStrategy: useRetry
            ? this.retryStrategy
            : () => undefined,
        });
        client.on('error', (e): void => {
          this.logger.error('Failed connection to the redis oss sentinel', e);
          reject(e);
        });
        client.on('ready', (): void => {
          this.logger.log('Successfully connected to the redis oss sentinel.');
          resolve(client);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  public async connectToDatabaseInstance(
    databaseDto: Database,
    tool = ClientContext.Common,
    connectionName?,
  ): Promise<Redis | Cluster> {
    const database = cloneClassInstance(databaseDto);
    Object.keys(database).forEach((key: string) => {
      if (database[key] === null) {
        delete database[key];
      }
    });

    let client;

    const { nodes, connectionType } = database;
    switch (connectionType) {
      case ConnectionType.STANDALONE:
        client = await this.createStandaloneClient(database, tool, true, connectionName);
        break;
      case ConnectionType.CLUSTER:
        client = await this.createClusterClient(database, nodes, true, connectionName);
        break;
      case ConnectionType.SENTINEL:
        client = await this.createSentinelClient(database, nodes, tool, true, connectionName);
        break;
      default:
        // AUTO
        client = await this.createClientAutomatically(database, tool, connectionName);
    }

    return client;
  }

  public async createClientAutomatically(database: Database, tool: ClientContext, connectionName) {
    // try sentinel connection
    if (database?.sentinelMaster) {
      try {
        return await this.createSentinelClient(database, database.nodes, tool, true, connectionName);
      } catch (e) {
        // ignore error
      }
    }

    // try cluster connection
    try {
      return await this.createClusterClient(database, database.nodes, true, connectionName);
    } catch (e) {
      // ignore error
    }

    // Standalone in any other case
    return this.createStandaloneClient(database, tool, true, connectionName);
  }

  public isClientConnected(client: Redis | Cluster): boolean {
    try {
      return client.status === 'ready';
    } catch (e) {
      return false;
    }
  }

  public getClientInstance(clientMetadata: ClientMetadata): IRedisClientInstance {
    const found = this.findClientInstance(clientMetadata.databaseId, clientMetadata.context, clientMetadata.uniqueId);
    if (found) {
      found.lastTimeUsed = Date.now();
    }
    this.syncClients();
    return found;
  }

  public removeClientInstance(clientMetadata: Partial<ClientMetadata>): number {
    const removed: IRedisClientInstance[] = remove<IRedisClientInstance>(
      this.clients,
      clientMetadata,
    );
    removed.forEach((clientInstance) => {
      clientInstance.client.disconnect();
    });
    return removed.length;
  }

  public setClientInstance(clientMetadata: ClientMetadata, client): 0 | 1 {
    const found = this.findClientInstance(
      clientMetadata.databaseId,
      clientMetadata.context,
      clientMetadata.uniqueId,
    );

    if (found) {
      const index = findIndex(this.clients, { uniqueId: found.uniqueId });
      this.clients[index].client.disconnect();
      this.clients[index] = {
        ...this.clients[index],
        lastTimeUsed: Date.now(),
        client,
      };
      return 0;
    }

    const clientInstance: IRedisClientInstance = {
      ...clientMetadata,
      uniqueId: clientMetadata.uniqueId || uuidv4(),
      lastTimeUsed: Date.now(),
      client,
    };
    this.clients.push(clientInstance);
    return 1;
  }

  private syncClients() {
    const currentTime = Date.now();
    const syncDif = currentTime - this.lastClientsSync;
    if (syncDif >= REDIS_CLIENTS_CONFIG.idleSyncInterval) {
      this.lastClientsSync = currentTime;
      this.clients = this.clients.filter((item) => {
        const idle = Date.now() - item.lastTimeUsed;
        if (idle >= REDIS_CLIENTS_CONFIG.maxIdleThreshold) {
          item.client.disconnect();
          return false;
        }
        return true;
      });
    }
  }

  private async getRedisConnectionConfig(
    database: Database,
  ): Promise<RedisOptions> {
    const {
      host, port, password, username, tls, db,
    } = database;
    const config: RedisOptions = {
      host, port, username, password, db,
    };
    if (tls) {
      config.tls = await this.getTLSConfig(database);
    }
    return config;
  }

  private async getTLSConfig(database: Database): Promise<ConnectionOptions> {
    let config: ConnectionOptions;
    config = {
      rejectUnauthorized: database.verifyServerCert,
      checkServerIdentity: () => undefined,
      servername: database.tlsServername || undefined,
    };
    if (database.caCert) {
      config = {
        ...config,
        ca: [database.caCert.certificate],
      };
    }
    if (database.clientCert) {
      config = {
        ...config,
        cert: database.clientCert.certificate,
        key: database.clientCert.key,
      };
    }

    return config;
  }

  private retryStrategy(times: number): number {
    if (times < REDIS_CLIENTS_CONFIG.retryTimes) {
      return Math.min(times * REDIS_CLIENTS_CONFIG.retryDelay, 2000);
    }
    return undefined;
  }

  private findClientInstance(
    databaseId: string,
    context: ClientContext = ClientContext.Common,
    uniqueId: string = undefined,
  ): IRedisClientInstance {
    const options = omitBy({ databaseId, uniqueId, context }, isNil);
    return find<IRedisClientInstance>(this.clients, options);
  }
}
