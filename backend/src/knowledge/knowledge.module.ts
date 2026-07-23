import { Module } from '@nestjs/common';
import { KnowledgeEngineService } from './knowledge-engine.service';

@Module({
  providers: [KnowledgeEngineService],
  exports: [KnowledgeEngineService],
})
export class KnowledgeModule {}
