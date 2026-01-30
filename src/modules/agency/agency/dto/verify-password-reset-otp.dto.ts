import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";

export class VerifyPasswordResetOtpDto {
    @ApiProperty({
        description: "The account email used for password reset",
        example: "john.doe@example.com",
    })
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    email: string;

    @ApiProperty({
        description: "The 6-digit OTP sent via email",
        example: "123456",
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{6}$/, { message: "OTP must be 6 digits." })
    otp: string;
}

