import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  mainGoal?: string;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  biometrics?: boolean;
}
