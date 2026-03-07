import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
    @ApiProperty({ description: "Current password (not required for Google OAuth users)", example: "OldPassword@123", required: false })
    @IsOptional()
    @IsString()
    oldPassword?: string;

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

