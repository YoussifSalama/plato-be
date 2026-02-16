import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class CancelInterviewDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;
}

