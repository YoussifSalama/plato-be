import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class SignupWithInvitationDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    f_name: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    l_name: string;

    @ApiProperty({ example: 'johndoe' })
    @IsString()
    @MinLength(3)
    @MaxLength(32)
    @Matches(/^[a-zA-Z0-9]+$/, { message: 'Username must contain only letters and numbers' })
    user_name: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @MinLength(8)
    @MaxLength(32)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'Password must contain uppercase, lowercase, number and special character',
    })
    password: string;
}