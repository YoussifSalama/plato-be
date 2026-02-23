import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { paginationDto } from "src/shared/dto/pagination.dto";
import { InterviewSessionStatus } from "@generated/prisma";

export { InterviewSessionStatus };

export enum SortOrder {
    asc = "asc",
    desc = "desc",
}

export enum InterviewSessionSortByEnum {
    created_at = "created_at",
    expires_at = "expires_at",
}

export class GetInterviewSessionsDto extends paginationDto {
    @ApiProperty({ description: "Agency id", example: 12 })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
    agency_id?: number;
    @ApiProperty({ description: "The sort by field", example: "created_at" })
    @IsEnum(InterviewSessionSortByEnum)
    @IsOptional()
    sort_by?: InterviewSessionSortByEnum;

    @ApiProperty({ description: "The sort order", example: "desc" })
    @IsEnum(SortOrder)
    @IsOptional()
    sort_order?: SortOrder;

    @ApiProperty({ description: "The search query", example: "frontend" })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiProperty({
        description: "Filter by interview session status",
        enum: InterviewSessionStatus,
        example: InterviewSessionStatus.active,
    })
    @IsEnum(InterviewSessionStatus)
    @IsOptional()
    status?: InterviewSessionStatus;

    @ApiProperty({
        description: "Filter sessions by date (YYYY-MM-DD). Returns all sessions created on this day.",
        example: "2026-02-24",
    })
    @IsDateString()
    @IsOptional()
    date?: string;
}
