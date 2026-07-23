import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ActionsModule } from './actions/actions.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BriefingModule } from './briefing/briefing.module';
import { BullMqRootModule } from './common/bullmq/bullmq.module';
import { CommonModule } from './common/common.module';
import { AppConfigService } from './common/config/app-config.service';
import { ContextModule } from './context/context.module';
import { ConversationsModule } from './conversations/conversations.module';
import { GraphModule } from './graph/graph.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { MembershipModule } from './membership/membership.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlannerModule } from './planner/planner.module';
import { ProfileModule } from './profile/profile.module';
import { PromptModule } from './prompt/prompt.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReasoningModule } from './reasoning/reasoning.module';
import { ScheduleModule } from './schedule/schedule.module';
import { SettingsModule } from './settings/settings.module';
import { SyncModule } from './sync/sync.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { WorkspaceEngineModule } from './workspace-engine/workspace-engine.module';
import { WorkspaceModule } from './workspace/workspace.module';

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
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            remove: true,
          },
          customProps: () => ({
            service: config.appName,
          }),
          autoLogging: true,
        },
      }),
    }),
    BullMqRootModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WorkspaceModule,
    MembershipModule,
    IntegrationsModule,
    SyncModule,
    GraphModule,
    KnowledgeModule,
    WorkspaceEngineModule,
    PlannerModule,
    ContextModule,
    PromptModule,
    AiModule,
    ReasoningModule,
    ActionsModule,
    BriefingModule,
    ScheduleModule,
    TasksModule,
    AnalyticsModule,
    ConversationsModule,
    NotificationsModule,
    ProfileModule,
    SettingsModule,
    RealtimeModule,
    AuditModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
