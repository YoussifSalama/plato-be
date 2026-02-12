import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CandidateVerifyAccountDto {
    @ApiProperty({ description: "Verification token" })
    @IsString()
    @IsNotEmpty()
    token: string;
}

