import Redis from 'ioredis';
import { Test, TestingModule } from '@nestjs/testing';
import { mockRedisNoPermError, mockStandaloneDatabaseEntity, MockType } from 'src/__mocks__';
import { IFindRedisClientInstanceByOptions, RedisService } from 'src/modules/redis/redis.service';
import { InstancesBusinessService } from 'src/modules/shared/services/instances-business/instances-business.service';
import { SlowLogService } from 'src/modules/slow-log/slow-log.service';
import { AppTool } from 'src/models';
import { mockRedisClientInstance } from 'src/modules/redis/redis-consumer.abstract.service.spec';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SlowLogArguments, SlowLogCommands } from 'src/modules/slow-log/constants/commands';
import { SlowLogAnalyticsService } from 'src/modules/slow-log/slow-log-analytics.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockClientOptions: IFindRedisClientInstanceByOptions = {
  instanceId: mockStandaloneDatabaseEntity.id,
  tool: AppTool.Common,
};

const getSlowLogDto = { count: 100 };
const mockSlowLog = {
  id: 1,
  time: 165234561,
  durationUs: 100,
  args: 'get foo',
  source: '127.0.0.1:12399',
  client: 'client-name',
};

const mockLogReply = [
  mockSlowLog.id,
  mockSlowLog.time,
  mockSlowLog.durationUs,
  mockSlowLog.args.split(' '),
  mockSlowLog.source,
  mockSlowLog.client,
];
const mockSlowLogConfig = {
  slowlogMaxLen: 128,
  slowlogLogSlowerThan: 10000,
};

const mockSlowlogConfigReply = [
  'slowlog-max-len',
  mockSlowLogConfig.slowlogMaxLen,
  'slowlog-log-slower-than',
  mockSlowLogConfig.slowlogLogSlowerThan,
];

const mockSlowLogReply = [mockLogReply, mockLogReply];

const mockRedisNode = Object.create(Redis.prototype);
mockRedisNode.call = jest.fn();

const mockRedisCluster = Object.create(Redis.Cluster.prototype);
mockRedisCluster.call = jest.fn();
mockRedisCluster.nodes = jest.fn().mockResolvedValue([mockRedisNode, mockRedisNode]);

describe('SlowLogService', () => {
  let service: SlowLogService;
  let analyticsService: SlowLogAnalyticsService;
  let redisService: MockType<RedisService>;
  let databaseService: MockType<InstancesBusinessService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlowLogService,
        EventEmitter2,
        SlowLogAnalyticsService,
        {
          provide: RedisService,
          useFactory: () => ({
            getClientInstance: jest.fn(),
            isClientConnected: jest.fn(),
          }),
        },
        {
          provide: InstancesBusinessService,
          useFactory: () => ({
            connectToInstance: jest.fn(),
            getOneById: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = await module.get(SlowLogService);
    redisService = await module.get(RedisService);
    databaseService = await module.get(InstancesBusinessService);
    analyticsService = await module.get(SlowLogAnalyticsService);

    redisService.getClientInstance.mockReturnValue({
      ...mockRedisClientInstance,
      client: mockRedisNode,
    });
    redisService.isClientConnected.mockReturnValue(true);
    mockRedisNode.call.mockResolvedValue(mockSlowLogReply);
    databaseService.connectToInstance.mockResolvedValueOnce(mockRedisNode);
  });

  describe('getSlowLogs', () => {
    it('should return slowlogs for standalone', async () => {
      const res = await service.getSlowLogs(mockClientOptions, getSlowLogDto);
      expect(res).toEqual([mockSlowLog, mockSlowLog]);
    });
    it('should return slowlogs for standalone without connection', async () => {
      redisService.getClientInstance.mockReturnValueOnce(false);
      const res = await service.getSlowLogs(mockClientOptions, getSlowLogDto);
      expect(res).toEqual([mockSlowLog, mockSlowLog]);
    });
    it('should return slowlogs for standalone without active connection', async () => {
      redisService.isClientConnected.mockReturnValue(false);
      const res = await service.getSlowLogs(mockClientOptions, getSlowLogDto);
      expect(res).toEqual([mockSlowLog, mockSlowLog]);
    });
    it('should return slowlogs cluster', async () => {
      redisService.getClientInstance.mockReturnValue({
        ...mockRedisClientInstance,
        client: mockRedisCluster,
      });
      const res = await service.getSlowLogs(mockClientOptions, getSlowLogDto);
      expect(res).toEqual([mockSlowLog, mockSlowLog, mockSlowLog, mockSlowLog]);
    });
    it('should proxy HttpException', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw new BadRequestException('error'); });
        await service.getSlowLogs(mockClientOptions, getSlowLogDto);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
    it('should throw an Forbidden error when command execution failed', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw mockRedisNoPermError; });
        await service.getSlowLogs(mockClientOptions, getSlowLogDto);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('reset', () => {
    it('should reset slowlogs for standalone', async () => {
      await service.reset(mockClientOptions);
      expect(mockRedisNode.call).toHaveBeenCalledWith(SlowLogCommands.SlowLog, SlowLogArguments.Reset);
    });
    it('should reset slowlogs cluster', async () => {
      redisService.getClientInstance.mockReturnValue({
        ...mockRedisClientInstance,
        client: mockRedisCluster,
      });
      await service.reset(mockClientOptions);
      expect(mockRedisNode.call).toHaveBeenCalledWith(SlowLogCommands.SlowLog, SlowLogArguments.Reset);
    });
    it('should proxy HttpException', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw new BadRequestException('error'); });
        await service.reset(mockClientOptions);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
    it('should throw an Forbidden error when command execution failed', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw mockRedisNoPermError; });
        await service.reset(mockClientOptions);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('getConfig', () => {
    it('should get slowlogs config', async () => {
      mockRedisNode.call.mockResolvedValueOnce(mockSlowlogConfigReply);

      const res = await service.getConfig(mockClientOptions);
      expect(res).toEqual(mockSlowLogConfig);
    });
    it('should get ONLY supported slowlogs config even if there some extra fields in resp', async () => {
      mockRedisNode.call.mockResolvedValueOnce([
        ...mockSlowlogConfigReply,
        'slowlog-extra',
        12,
      ]);

      const res = await service.getConfig(mockClientOptions);
      expect(res).toEqual(mockSlowLogConfig);
    });
    it('should proxy HttpException', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw new BadRequestException('error'); });
        await service.getConfig(mockClientOptions);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
    it('should throw an Forbidden error when command execution failed', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw mockRedisNoPermError; });
        await service.getConfig(mockClientOptions);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('updateConfig', () => {
    it('should update slowlogs config (1 field)', async () => {
      mockRedisNode.call.mockResolvedValueOnce(mockSlowlogConfigReply);
      mockRedisNode.call.mockResolvedValueOnce('OK');

      const res = await service.updateConfig(mockClientOptions, { slowlogMaxLen: 128 });
      expect(res).toEqual(mockSlowLogConfig);
      expect(mockRedisNode.call).toHaveBeenCalledTimes(2);
    });
    it('should update slowlogs config (2 fields)', async () => {
      mockRedisNode.call
        .mockResolvedValueOnce(mockSlowlogConfigReply)
        .mockResolvedValueOnce('OK')
        .mockResolvedValueOnce('OK');

      const res = await service.updateConfig(mockClientOptions, { slowlogMaxLen: 128, slowlogLogSlowerThan: 1 });
      expect(res).toEqual({ slowlogMaxLen: 128, slowlogLogSlowerThan: 1 });
      expect(mockRedisNode.call).toHaveBeenCalledTimes(3);
    });
    it('should throw an error for cluster', async () => {
      try {
        mockRedisCluster.call.mockResolvedValueOnce(mockSlowlogConfigReply);

        redisService.getClientInstance.mockReturnValue({
          ...mockRedisClientInstance,
          client: mockRedisCluster,
        });
        await service.updateConfig(mockClientOptions, { slowlogMaxLen: 128, slowlogLogSlowerThan: 1 });

        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
    it('should proxy HttpException', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw new BadRequestException('error'); });
        await service.updateConfig(mockClientOptions, { slowlogMaxLen: 1 });
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
    it('should throw an Forbidden error when command execution failed', async () => {
      try {
        redisService.getClientInstance.mockImplementationOnce(() => { throw mockRedisNoPermError; });
        await service.updateConfig(mockClientOptions, { slowlogMaxLen: 1 });
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
