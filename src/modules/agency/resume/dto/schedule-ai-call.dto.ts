import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional } from "class-validator";

export class ScheduleAiCallDto {
    @ApiPropertyOptional({
        description: "When to perform the AI call. If omitted or in the past, the call is scheduled immediately.",
        example: "2026-02-23T15:30:00.000Z",
    })
    @IsOptional()
    @IsISO8601()
    scheduledAt?: string;
}

