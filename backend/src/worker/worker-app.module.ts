import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { BullMqRootModule } from '../common/bullmq/bullmq.module';
import { CommonModule } from '../common/common.module';
import { AppConfigService } from '../common/config/app-config.service';
import { WorkerModule } from './worker.module';

/**
 * Minimal Nest context for the BullMQ worker process.
 * Avoids booting HTTP controllers / Swagger from AppModule.
 */
@Module({
  imports: [
    CommonModule,
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          transport: config.isDevelopment
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
        },
      }),
    }),
    BullMqRootModule,
    WorkerModule,
  ],
})
export class WorkerAppModule {}
