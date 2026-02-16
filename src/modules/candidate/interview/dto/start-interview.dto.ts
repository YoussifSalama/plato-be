import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class StartInterviewDto {
    @ApiProperty({ description: "Invitation token id", example: 456 })
    @IsInt()
    @Min(1)
    interview_token: number;
}

