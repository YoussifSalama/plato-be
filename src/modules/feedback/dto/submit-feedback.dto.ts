import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, IsDateString } from "class-validator";
import { FeedbackFrom, FeedbackDecision } from "../../../generated/prisma";

export class SubmitFeedbackDto {
    @ApiProperty({ description: "Interview session ID" })
    @IsInt()
    session_id: number;

    @ApiProperty({ minimum: 1, maximum: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    comment?: string;

    @ApiPropertyOptional({ enum: FeedbackDecision })
    @IsEnum(FeedbackDecision)
    @IsOptional()
    decision?: FeedbackDecision;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    proposed_date_range_start?: string;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    proposed_date_range_end?: string;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    selected_date?: string;
}
