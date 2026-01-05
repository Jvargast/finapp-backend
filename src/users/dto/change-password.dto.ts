import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'La contraseña actual es requerida' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'La contraseña debe contener: mayúscula, minúscula, número y símbolo (@$!%*?&)',
  })
  newPassword: string;
}
