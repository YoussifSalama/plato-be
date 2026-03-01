import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsIn, IsInt, Matches, Min, ValidateIf } from "class-validator";

export class PostponeInterviewDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;

    @ApiProperty({
        description: "Reschedule mode: immediate link or choose a day/date in range.",
        example: "pick_date",
        enum: ["immediate", "pick_datetime", "pick_date"],
    })
    @IsIn(["immediate", "pick_datetime", "pick_date"])
    mode: "immediate" | "pick_datetime" | "pick_date";

    @ApiProperty({
        description: "Chosen datetime when mode is pick_datetime.",
        example: "2026-03-02T10:30:00.000Z",
        required: false,
    })
    @ValidateIf((value: PostponeInterviewDto) => value.mode === "pick_datetime")
    @IsDateString()
    scheduled_for?: string;

    @ApiProperty({
        description: "Chosen day when mode is pick_date (YYYY-MM-DD).",
        example: "2026-03-02",
        required: false,
    })
    @ValidateIf((value: PostponeInterviewDto) => value.mode === "pick_date")
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    scheduled_for_date?: string;
}

