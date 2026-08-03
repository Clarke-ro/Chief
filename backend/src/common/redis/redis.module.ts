import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';
import { REDIS_CLIENT, REDIS_RESOLVED_URL } from './redis.constants';
import { resolveWorkingRedisUrl } from './redis-url.resolve';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_RESOLVED_URL,
      inject: [AppConfigService],
      useFactory: async (config: AppConfigService): Promise<string> => {
        return resolveWorkingRedisUrl(config.redisUrls);
      },
    },
    {
      provide: REDIS_CLIENT,
      inject: [REDIS_RESOLVED_URL],
      useFactory: (redisUrl: string): Redis => {
        const logger = new Logger('RedisModule');
        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: false,
          connectTimeout: 10_000,
          commandTimeout: 5_000,
          ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
        });

        client.on('connect', () => logger.log('Redis connecting'));
        client.on('ready', () => logger.log('Redis ready'));
        client.on('error', (error: Error) =>
          logger.error(`Redis error: ${error.message}`),
        );

        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_RESOLVED_URL, RedisService],
})
export class RedisModule {}
