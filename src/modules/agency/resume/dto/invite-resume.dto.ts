import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class InviteResumeDto {
    @ApiPropertyOptional({ description: "Override recipient email", example: "candidate@example.com" })
    @IsOptional()
    @IsEmail()
    recipient_email?: string;

    @ApiPropertyOptional({ description: "Override recipient name", example: "John Doe" })
    @IsOptional()
    @IsString()
    recipient_name?: string;
}

