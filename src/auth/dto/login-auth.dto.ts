import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginAuthDto {
  @IsEmail({}, { message: 'El formato del correo no es válido' }) 
  @IsNotEmpty({ message: 'El correo es obligatorio' })           
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' }) 
  password: string;
}