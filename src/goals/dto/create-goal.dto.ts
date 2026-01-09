import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Currency, GoalType } from '@prisma/client';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsEnum(GoalType)
  type: GoalType;

  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @IsNumber()
  @Min(1)
  targetAmount: number;

  @IsNumber()
  @IsOptional()
  currentAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyQuota?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedYield?: number;

  @IsDateString()
  deadline: string;

  @IsNumber()
  @IsOptional()
  interestRate?: number;
}
