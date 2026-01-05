import { IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message:
      'El usuario solo puede contener letras, números, puntos y guiones bajos',
  })
  username?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
