import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './config/app-config.service';
import { buildConfiguration } from './config/configuration';
import { validateEnv } from './config/env.schema';
import { EncryptionService } from './encryption/encryption.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: (config) => {
        const env = validateEnv(config);
        return buildConfiguration(env);
      },
    }),
    PrismaModule,
    RedisModule,
  ],
  providers: [AppConfigService, EncryptionService],
  exports: [
    ConfigModule,
    AppConfigService,
    EncryptionService,
    PrismaModule,
    RedisModule,
  ],
})
export class CommonModule {}
