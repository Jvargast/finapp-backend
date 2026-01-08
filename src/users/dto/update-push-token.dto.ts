import { IsString, IsNotEmpty } from 'class-validator';

export class UpdatePushTokenDto {
  @IsString()
  @IsNotEmpty()
  pushToken: string;
}
