import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @IsString()
  lastName: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'La contraseña debe contener: mayúscula, minúscula, número y símbolo (@$!%*?&)',
  })
  password: string;
}
