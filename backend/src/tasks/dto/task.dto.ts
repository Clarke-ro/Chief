import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const PLATFORMS = [
  'gmail',
  'calendar',
  'slack',
  'github',
  'notion',
  'asana',
  'trello',
] as const;

const PRIORITIES = ['high', 'medium', 'low'] as const;
const STATUSES = ['ready', 'in_progress', 'waiting', 'done'] as const;
const SECTIONS = ['today', 'upcoming', 'waiting', 'completed'] as const;

export class CreateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;

  @IsOptional()
  @IsIn([...PLATFORMS])
  platform?: (typeof PLATFORMS)[number];

  @IsOptional()
  @IsIn([...PRIORITIES])
  priority?: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsIn([...STATUSES])
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsIn([...SECTIONS])
  section?: (typeof SECTIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  estimatedTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  estimatedMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dueLabel?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;

  @IsOptional()
  @IsIn([...PLATFORMS])
  platform?: (typeof PLATFORMS)[number];

  @IsOptional()
  @IsIn([...PRIORITIES])
  priority?: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsIn([...STATUSES])
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsIn([...SECTIONS])
  section?: (typeof SECTIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  estimatedTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  estimatedMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dueLabel?: string;
}
