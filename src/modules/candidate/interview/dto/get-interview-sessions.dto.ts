import { InterviewSessionStatus } from "@generated/prisma";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { SortOrder } from "src/modules/agency/job/dto/get-jobs.dto";
import { paginationDto } from "src/shared/dto/pagination.dto";

export enum InterviewSessionSortByEnum {
    created_at = "created_at",
    expires_at = "expires_at",
}

export class GetInterviewSessionsDto extends paginationDto {
    @ApiProperty({ description: "The sort by field", example: "created_at" })
    @IsEnum(InterviewSessionSortByEnum)
    @IsOptional()
    sort_by?: InterviewSessionSortByEnum;

    @ApiProperty({ description: "The sort order", example: "desc" })
    @IsEnum(SortOrder)
    @IsOptional()
    sort_order?: SortOrder;

    @ApiProperty({ description: "The status of the interview session", example: "active" })
    @IsEnum(InterviewSessionStatus)
    @IsOptional()
    status?: InterviewSessionStatus;

    @ApiProperty({ description: "The search query", example: "frontend" })
    @IsString()
    @IsOptional()
    search?: string;
}