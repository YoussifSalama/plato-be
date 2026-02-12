import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CandidateVerifyPasswordResetOtpDto {
    @ApiProperty({ example: "candidate@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "123456" })
    @IsString()
    @IsNotEmpty()
    otp: string;
}

