import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AgencyGoogleLoginDto {
  @ApiProperty({
    description: 'Google ID token obtained on the frontend after Google sign-in',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

