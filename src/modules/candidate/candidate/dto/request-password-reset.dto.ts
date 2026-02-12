import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class CandidateRequestPasswordResetDto {
    @ApiProperty({ example: "candidate@example.com" })
    @IsEmail()
    email: string;
}

