import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { AppConfigService } from './common/config/app-config.service';

@ApiTags('meta')
@Public()
@Controller()
export class AppController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  @ApiOperation({ summary: 'API root (service metadata)' })
  root() {
    return {
      service: this.config.appName,
      status: 'ok',
      docs: '/docs',
      health: '/health/live',
      auth: '/api/auth',
      api: `/${this.config.apiPrefix}`,
    };
  }
}
