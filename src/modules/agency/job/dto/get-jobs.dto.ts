import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { paginationDto } from "src/shared/dto/pagination.dto";

export enum SortOrder {
    asc = "asc",
    desc = "desc",
}

export enum SortBy {
    title = "title",
    created_at = "created_at",
    updated_at = "updated_at",
}

export class GetJobsDto extends paginationDto {
    @ApiProperty({
        description: "Partial matching string for job title or location",
        example: "Frontend",
    })
    @IsString()
    @IsOptional()
    partial_matching?: string;

    @ApiProperty({
        description: "Sort by field",
        example: SortBy.created_at,
    })
    @IsEnum(SortBy)
    @IsOptional()
    sort_by?: SortBy;

    @ApiProperty({
        description: "Sort order",
        example: SortOrder.desc,
    })
    @IsEnum(SortOrder)
    @IsOptional()
    sort_order?: SortOrder;

    @ApiProperty({
        description: "Filter by active status",
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined ? undefined : value === "true" || value === true
    )
    is_active?: boolean;
}

