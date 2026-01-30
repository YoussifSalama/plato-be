import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Matches, MaxLength, MinLength, IsString, IsEmail } from "class-validator";

export class SignupDto {
    @ApiProperty({
        description: 'The first name of the user',
        example: 'John',
    })
    @IsString()
    @IsNotEmpty()
    f_name: string;

    @ApiProperty({
        description: 'The last name of the user',
        example: 'Doe',
    })
    @IsString()
    @IsNotEmpty()
    l_name: string;

    @ApiProperty({
        description: 'The email of the user',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    email: string;

    @ApiProperty({
        description: 'The username of the user',
        example: 'john_doe',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(32)
    @Matches(/^[a-zA-Z0-9]+$/, {
        message: 'Username must contain only letters and numbers',
    })
    user_name: string;

    @ApiProperty({
        description: 'The password of the user',
        example: 'Password@123',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(32)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    })
    password: string;
}