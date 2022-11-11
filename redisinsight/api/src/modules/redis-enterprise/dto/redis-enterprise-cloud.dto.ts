import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsInt,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CloudAuthDto,
  RedisCloudDatabase,
} from 'src/modules/redis-enterprise/dto/cloud.dto';
import { ActionStatus } from 'src/common/models';

export class AddRedisCloudDatabaseDto {
  @ApiProperty({
    description: 'Subscription id',
    type: Number,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsInt({ always: true })
  subscriptionId: number;

  @ApiProperty({
    description: 'Database id',
    type: Number,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsInt({ always: true })
  databaseId: number;
}

export class AddMultipleRedisCloudDatabasesDto extends CloudAuthDto {
  @ApiProperty({
    description: 'Cloud databases list.',
    type: AddRedisCloudDatabaseDto,
    isArray: true,
  })
  @IsDefined()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => AddRedisCloudDatabaseDto)
  databases: AddRedisCloudDatabaseDto[];
}

export class AddRedisCloudDatabaseResponse {
  @ApiProperty({
    description: 'Subscription id',
    type: Number,
  })
  subscriptionId: number;

  @ApiProperty({
    description: 'Database id',
    type: Number,
  })
  databaseId: number;

  @ApiProperty({
    description: 'Add Redis Cloud database status',
    default: ActionStatus.Success,
    enum: ActionStatus,
  })
  status: ActionStatus;

  @ApiProperty({
    description: 'Message',
    type: String,
  })
  message: string;

  @ApiPropertyOptional({
    description: 'The database details.',
    type: RedisCloudDatabase,
  })
  databaseDetails?: RedisCloudDatabase;

  @ApiPropertyOptional({
    description: 'Error',
  })
  error?: string | object;
}
