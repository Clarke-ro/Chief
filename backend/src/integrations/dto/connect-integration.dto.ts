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
      'Post-OAuth return URL: chief:// / exp:// / exps:// app callbacks, or an https origin listed in CORS_ORIGINS (e.g. Vercel /integrations/callback).',
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

/** Query DTO for workspace-scoped GET/DELETE routes. */
export class WorkspaceIdQueryDto {
  @ApiProperty({
    description: 'Workspace id (cuid or uuid)',
  })
  @IsString()
  @MinLength(8)
  workspaceId!: string;
}
