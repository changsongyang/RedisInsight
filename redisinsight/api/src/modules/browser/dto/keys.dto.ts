import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { MAX_TTL_NUMBER } from 'src/constants/redis-keys';

export enum RedisDataType {
  String = 'string',
  Hash = 'hash',
  List = 'list',
  Set = 'set',
  ZSet = 'zset',
  Stream = 'stream',
  JSON = 'ReJSON-RL',
  Graph = 'graphdata',
  TS = 'TSDB-TYPE',
}

export class KeyDto {
  @ApiProperty({
    description: 'Key Name',
    type: String,
  })
  @IsDefined()
  // @IsString()
  @Transform((value) => {
    if (value?.type === 'Buffer') {
      return Buffer.from(Object.values(value.data));
    }

    return value;
  })
  keyName: string;
}

export class KeyWithExpireDto extends KeyDto {
  @ApiPropertyOptional({
    type: Number,
    description:
      'Set a timeout on key in seconds. After the timeout has expired, the key will automatically be deleted.',
    minimum: 1,
    maximum: MAX_TTL_NUMBER,
  })
  @IsOptional()
  @IsInt({ always: true })
  @Min(1)
  @Max(MAX_TTL_NUMBER)
  expire?: number;
}

export class ScanDataTypeDto extends KeyDto {
  @ApiProperty({
    description:
      'Iteration cursor. '
      + 'An iteration starts when the cursor is set to 0, and terminates when the cursor returned by the server is 0.',
    type: Number,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsNotEmpty()
  cursor: number;

  @ApiPropertyOptional({
    description: 'Specifying the number of elements to return.',
    type: Number,
    minimum: 1,
    default: 15,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsNotEmpty()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({
    description: 'Iterate only elements matching a given pattern.',
    type: String,
    default: '*',
  })
  @IsString()
  @IsOptional()
  match?: string;
}

export class GetKeysDto {
  @ApiProperty({
    description:
      'Iteration cursor. '
      + 'An iteration starts when the cursor is set to 0, and terminates when the cursor returned by the server is 0.',
    type: String,
    default: '0',
  })
  @Type(() => String)
  @IsNotEmpty()
  cursor: string;

  @ApiPropertyOptional({
    description: 'Specifying the number of elements to return.',
    type: Number,
    minimum: 1,
    default: 15,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsNotEmpty()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({
    description: 'Iterate only elements matching a given pattern.',
    type: String,
    default: '*',
  })
  @IsString()
  @IsOptional()
  match?: string;

  @ApiPropertyOptional({
    description:
      'Iterate through the database looking for keys of a specific type.',
    enum: RedisDataType,
  })
  @IsEnum(RedisDataType, {
    message: `destination must be a valid enum value. Valid values: ${Object.values(
      RedisDataType,
    )}.`,
  })
  @IsOptional()
  type?: RedisDataType;
}

export class GetKeyInfoDto extends KeyDto {}

export class DeleteKeysDto {
  @ApiProperty({
    description: 'Key name',
    type: String,
    isArray: true,
  })
  @IsDefined()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => String)
  keyNames: string[];
}

export class DeleteKeysResponse {
  @ApiProperty({
    description: 'Number of affected keys',
    type: Number,
  })
  affected: number;
}

export class RenameKeyDto {
  @ApiProperty({
    description: 'Key name',
    type: String,
  })
  @IsDefined()
  @IsString()
  keyName: string;

  @ApiProperty({
    description: 'New key name',
    type: String,
  })
  @IsDefined()
  @IsString()
  newKeyName: string;
}

export class RenameKeyResponse {
  @ApiProperty({
    description: 'Key name',
    type: String,
  })
  keyName: string;
}

export class UpdateKeyTtlDto {
  @ApiProperty({
    description: 'Key name',
    type: String,
  })
  @IsDefined()
  @IsString()
  keyName: string;

  @ApiProperty({
    type: Number,
    description:
      'Set a timeout on key in seconds. After the timeout has expired, the key will automatically be deleted. '
      + 'If the property has value of -1, then the key timeout will be removed.',
    maximum: MAX_TTL_NUMBER,
  })
  @IsNotEmpty()
  @IsInt({ always: true })
  @Max(MAX_TTL_NUMBER)
  ttl: number;
}

export class KeyTtlResponse {
  @ApiProperty({
    type: Number,
    description:
      'The remaining time to live of a key that has a timeout. '
      + 'If value equals -2 then the key does not exist or has deleted. '
      + 'If value equals -1 then the key has no associated expire (No limit).',
    maximum: MAX_TTL_NUMBER,
  })
  ttl: number;
}

export class GetKeyInfoResponse {
  @ApiProperty({
    type: String,
  })
  name: string;

  @ApiProperty({
    type: String,
  })
  type: string;

  @ApiProperty({
    type: Number,
    description:
      'The remaining time to live of a key.'
      + ' If the property has value of -1, then the key has no expiration time (no limit).',
  })
  ttl: number;

  @ApiProperty({
    type: Number,
    description:
      'The number of bytes that a key and its value require to be stored in RAM.',
  })
  size: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'The length of the value stored in a key.',
  })
  length?: number;
}

export class GetKeysWithDetailsResponse {
  @ApiProperty({
    type: Number,
    default: 0,
    description:
      'The new cursor to use in the next call.'
      + ' If the property has value of 0, then the iteration is completed.',
  })
  cursor: number;

  @ApiProperty({
    type: Number,
    description: 'The number of keys in the currently-selected database.',
  })
  total: number;

  @ApiProperty({
    type: Number,
    description:
      'The number of keys we tried to scan. Be aware that '
      + 'scanned is sum of COUNT parameters from redis commands',
  })
  scanned: number;

  @ApiProperty({
    type: () => GetKeyInfoResponse,
    description: 'Array of Keys.',
    isArray: true,
  })
  keys: GetKeyInfoResponse[];

  @ApiPropertyOptional({
    type: String,
    description: 'Node host. In case when we are working with cluster',
  })
  host?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Node port. In case when we are working with cluster',
  })
  port?: number;
}
