import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
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

const STATUSES = ['completed', 'in_progress', 'upcoming'] as const;
const BLOCK_KINDS = ['normal', 'major'] as const;
const SWEEP_PHASES = ['none', 'checking', 'cleared', 'still_open'] as const;

export class CreateScheduleItemDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsIn([...PLATFORMS])
  platform!: (typeof PLATFORMS)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  time!: string;

  @IsOptional()
  @IsIn([...STATUSES])
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  attendees?: number;

  @IsOptional()
  @IsIn([...BLOCK_KINDS])
  blockKind?: (typeof BLOCK_KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  focusId?: string;
}

export class UpdateScheduleItemDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsOptional()
  @IsIn([...PLATFORMS])
  platform?: (typeof PLATFORMS)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  time?: string;

  @IsOptional()
  @IsIn([...STATUSES])
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  attendees?: number;

  @IsOptional()
  @IsIn([...BLOCK_KINDS])
  blockKind?: (typeof BLOCK_KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  focusId?: string | null;

  @IsOptional()
  @IsIn([...SWEEP_PHASES])
  sweepPhase?: (typeof SWEEP_PHASES)[number];

  @IsOptional()
  @IsInt()
  lastSweepAt?: number | null;
}
