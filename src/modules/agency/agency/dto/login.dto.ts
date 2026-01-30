import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class LoginDto {
    @ApiProperty({
        description: "The email of the user",
        example: "john.doe@example.com",
    })
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    email: string;

    @ApiProperty({
        description: "The password of the user",
        example: "Password@123",
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}

