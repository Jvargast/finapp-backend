import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  icon?: string; 

  @IsString()
  @IsOptional()
  color?: string;

  @IsEnum(TransactionType)
  type: TransactionType; 
}