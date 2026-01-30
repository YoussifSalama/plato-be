import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateInvitationDto {
    @ApiProperty({ example: 123 })
    @IsInt()
    @Min(1)
    resume_id: number;

    @ApiProperty({ example: "candidate@example.com" })
    @IsEmail()
    @IsNotEmpty()
    recipient_email: string;

    @ApiPropertyOptional({ example: "John Doe" })
    @IsOptional()
    @IsString()
    recipient_name?: string;
}

