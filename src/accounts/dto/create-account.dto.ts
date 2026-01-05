import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Currency } from '@prisma/client'; 

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  balance?: number; 

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency; 
}