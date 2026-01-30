import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
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

    @ApiProperty({ description: "New password", example: "NewPassword@123" })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(32)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
    })
    newPassword: string;
}

