import { Module } from '@nestjs/common';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { ConversationsController } from './conversations.controller';

@Module({
  imports: [ReasoningModule],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
