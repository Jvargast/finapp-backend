import { IsNumber, IsString, IsEnum, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsNumber()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType; 

  @IsUUID()
  accountId: string; 

  @IsUUID()
  categoryId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string; 
}