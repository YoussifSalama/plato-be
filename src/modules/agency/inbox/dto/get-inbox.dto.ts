import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";
import { InboxStatus, InboxType } from "@generated/prisma";
import { paginationDto } from "src/shared/dto/pagination.dto";

export enum InboxSortBy {
    created_at = "created_at",
}

export enum SortOrder {
    asc = "asc",
    desc = "desc",
}

export class GetInboxDto extends paginationDto {
    @ApiPropertyOptional({
        description: "Filter by inbox status",
        enum: InboxStatus,
        enumName: "InboxStatus",
    })
    @IsEnum(InboxStatus)
    @IsOptional()
    status?: InboxStatus;

    @ApiPropertyOptional({
        description: "Filter by inbox type",
        enum: InboxType,
        enumName: "InboxType",
    })
    @IsEnum(InboxType)
    @IsOptional()
    type?: InboxType;

    @ApiPropertyOptional({
        description: "Sort by field",
        enum: InboxSortBy,
        enumName: "InboxSortBy",
    })
    @IsEnum(InboxSortBy)
    @IsOptional()
    sort_by?: InboxSortBy;

    @ApiPropertyOptional({
        description: "Sort order",
        enum: SortOrder,
        enumName: "SortOrder",
    })
    @IsEnum(SortOrder)
    @IsOptional()
    @Transform(({ value }) => (value === "asc" ? SortOrder.asc : SortOrder.desc))
    sort_order?: SortOrder;
}

