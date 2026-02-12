import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CandidateSignupDto {
    @ApiProperty({ example: "Youssif" })
    @IsString()
    @IsNotEmpty()
    f_name: string;

    @ApiProperty({ example: "Salama" })
    @IsString()
    @IsNotEmpty()
    l_name: string;

    @ApiProperty({ example: "youssif@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "StrongPass#123" })
    @IsString()
    @MinLength(8)
    password: string;
}

