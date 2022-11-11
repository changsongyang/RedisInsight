import config from 'src/utils/config';
import { Module, Type } from '@nestjs/common';
import { DatabaseService } from 'src/modules/database/database.service';
import { DatabaseController } from 'src/modules/database/database.controller';
import { DatabaseRepository } from 'src/modules/database/repositories/database.repository';
import { LocalDatabaseRepository } from 'src/modules/database/repositories/local.database.repository';
import { DatabaseAnalytics } from 'src/modules/database/database.analytics';
import { DatabaseConnectionService } from 'src/modules/database/database-connection.service';
import { DatabaseInfoProvider } from 'src/modules/database/providers/database-info.provider';
import { DatabaseFactory } from 'src/modules/database/providers/database.factory';
import { DatabaseInfoController } from 'src/modules/database/database-info.controller';
import { DatabaseInfoService } from 'src/modules/database/database-info.service';
import { DatabaseOverviewProvider } from 'src/modules/database/providers/database-overview.provider';
import { StackDatabasesRepository } from 'src/modules/database/repositories/stack.databases.repository';

const SERVER_CONFIG = config.get('server');

@Module({})
export class DatabaseModule {
  static register(
    databaseRepository: Type<DatabaseRepository> =
    SERVER_CONFIG.buildType === 'REDIS_STACK' ? StackDatabasesRepository : LocalDatabaseRepository,
  ) {
    return {
      module: DatabaseModule,
      controllers: [
        DatabaseController,
        DatabaseInfoController,
      ],
      providers: [
        DatabaseService,
        DatabaseConnectionService,
        DatabaseInfoProvider,
        DatabaseAnalytics,
        DatabaseFactory,
        DatabaseInfoService,
        DatabaseOverviewProvider,
        {
          provide: DatabaseRepository,
          useClass: databaseRepository,
        },
      ],
      exports: [
        DatabaseService,
        DatabaseConnectionService,
        // todo: rethink everything below
        DatabaseFactory,
        DatabaseInfoService,
        DatabaseInfoProvider,
      ],
    };
  }
  // todo: check if still needed
  // configure(consumer: MiddlewareConsumer): any {
  //   consumer
  //     .apply(RedisConnectionMiddleware)
  //     .forRoutes({ path: 'instance/:dbInstance/connect', method: RequestMethod.GET });
  // }
}
