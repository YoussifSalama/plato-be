import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class RequestPasswordResetDto {
    @ApiProperty({
        description: "The account email used for password reset",
        example: "john.doe@example.com",
    })
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    email: string;
}

