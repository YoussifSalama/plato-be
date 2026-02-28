import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsIn, IsInt, Min, ValidateIf } from "class-validator";

export class PostponeInterviewDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;

    @ApiProperty({
        description: "Reschedule mode: immediate link or choose a datetime in range.",
        example: "immediate",
        enum: ["immediate", "pick_datetime"],
    })
    @IsIn(["immediate", "pick_datetime"])
    mode: "immediate" | "pick_datetime";

    @ApiProperty({
        description: "Chosen datetime when mode is pick_datetime.",
        example: "2026-03-02T10:30:00.000Z",
        required: false,
    })
    @ValidateIf((value: PostponeInterviewDto) => value.mode === "pick_datetime")
    @IsDateString()
    scheduled_for?: string;
}

