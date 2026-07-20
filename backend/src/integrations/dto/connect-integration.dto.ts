import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConnectIntegrationDto {
  @ApiProperty({
    description: 'Workspace that will own the connected account (cuid or uuid)',
  })
  @IsString()
  @MinLength(8)
  workspaceId!: string;

  @ApiPropertyOptional({
    description:
      'App deep link to open after OAuth (chief://, exp://, or exps://). Stored in OAuth state.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  returnTo?: string;
}

export class WorkspaceScopedDto {
  @ApiProperty({
    description: 'Workspace id (cuid or uuid)',
  })
  @IsString()
  @MinLength(8)
  workspaceId!: string;
}
