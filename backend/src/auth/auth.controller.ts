import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  type AuthUser,
} from './decorators/current-user.decorator';

class OnboardingBodyDto {
  @IsBoolean()
  completed!: boolean;
}

@ApiTags('auth')
@ApiBearerAuth()
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user + workspaces' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user);
  }

  @Post('me/onboarding')
  @ApiOperation({ summary: 'Set onboardingCompleted for the current user' })
  setOnboarding(
    @CurrentUser() user: AuthUser,
    @Body() body: OnboardingBodyDto,
  ) {
    return this.authService.setOnboardingCompleted(user.id, body.completed);
  }
}
