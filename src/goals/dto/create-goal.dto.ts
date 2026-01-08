import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { GoalType } from '@prisma/client';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsEnum(GoalType)
  type: GoalType;

  @IsNumber()
  @Min(1)
  targetAmount: number;

  @IsNumber()
  @IsOptional()
  currentAmount?: number;

  @IsDateString()
  deadline: string;

  @IsNumber()
  @IsOptional()
  interestRate?: number;
}
