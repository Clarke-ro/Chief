import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ChiefHistoryTurnDto {
  @IsIn(['user', 'chief'])
  role!: 'user' | 'chief';

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class ChiefChatBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  focusId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChiefHistoryTurnDto)
  history?: ChiefHistoryTurnDto[];
}
