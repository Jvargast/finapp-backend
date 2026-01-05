import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum SensitiveField {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export class RequestChangeDto {
  @IsEnum(SensitiveField)
  field: SensitiveField;

  @ValidateIf((o) => o.field === SensitiveField.EMAIL)
  @IsEmail({}, { message: 'Formato de correo inválido' })
  newValue: string;

  @ValidateIf((o) => o.field === SensitiveField.PHONE)
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('CL', {
    message: 'Debes ingresar un número válido (ej: +56912345678)',
  })
  newValuePhone: string;
}
