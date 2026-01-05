import { IsString, Length, IsEnum, IsNotEmpty } from 'class-validator';
import { SensitiveField } from './request-change.dto';

export class VerifyChangeDto {
  @IsEnum(SensitiveField)
  field: SensitiveField;

  @IsString()
  @IsNotEmpty()
  newValue: string;

  @IsString()
  @Length(6, 6, { message: 'El código debe ser de 6 dígitos' })
  code: string;
}
