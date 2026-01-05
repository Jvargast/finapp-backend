import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Currency } from '@prisma/client'; 

export class CompleteSetupDto {
  @IsNotEmpty()
  @IsEnum(Currency)
  currency: Currency; 

  @IsNumber()
  initialBalance: number;

  @IsNotEmpty()
  @IsString()
  mainGoal: string; 
}