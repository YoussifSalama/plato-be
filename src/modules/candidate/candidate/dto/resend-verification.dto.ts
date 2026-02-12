import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CandidateResendVerificationDto {
    @ApiProperty({ description: "Verification token" })
    @IsString()
    @IsNotEmpty()
    token: string;
}

