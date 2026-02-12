import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CandidateResetPasswordDto {
    @ApiProperty({ example: "candidate@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "123456" })
    @IsString()
    @IsNotEmpty()
    otp: string;

    @ApiProperty({ example: "NewStrong#123" })
    @IsString()
    @MinLength(8)
    newPassword: string;
}

