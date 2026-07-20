import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ConnectIntegrationDto {
  @ApiProperty({
    description: 'Workspace that will own the connected account',
  })
  @IsUUID()
  workspaceId!: string;

  @ApiPropertyOptional({
    description: 'Optional client return hint (unused server-side today)',
  })
  @IsOptional()
  @IsString()
  returnTo?: string;
}

export class WorkspaceScopedDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;
}
