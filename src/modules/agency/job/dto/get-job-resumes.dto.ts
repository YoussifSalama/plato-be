import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { paginationDto } from "src/shared/dto/pagination.dto";

export enum SortOrder {
    asc = "asc",
    desc = "desc",
}

export enum SortBy {
    name = "name",
    created_at = "created_at",
    updated_at = "updated_at",
}

export enum ResumeAnalysisRecommendationEnum {
    recommended = "recommended",
    not_recommended = "not_recommended",
    consider = "consider",
    highly_recommended = "highly_recommended",
}

export class GetJobResumesDto extends paginationDto {
    @ApiProperty({
        description: "The partial matching string",
        example: "John Doe",
    })
    @IsString()
    @IsOptional()
    partial_matching?: string;

    @ApiProperty({
        description: "The sort by field",
        example: SortBy.created_at,
    })
    @IsEnum(SortBy)
    @IsOptional()
    sort_by?: SortBy;

    @ApiProperty({
        description: "The sort order",
        example: SortOrder.desc,
    })
    @IsEnum(SortOrder)
    @IsOptional()
    sort_order?: SortOrder;

    @ApiProperty({
        description: "Minimum score threshold (e.g. 60 means 60 and above)",
        example: 60,
    })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
    score?: number;

    @ApiProperty({
        description: "Filter by recommendation",
        example: ResumeAnalysisRecommendationEnum.recommended,
        enum: ResumeAnalysisRecommendationEnum,
    })
    @IsEnum(ResumeAnalysisRecommendationEnum)
    @IsOptional()
    recommendation?: ResumeAnalysisRecommendationEnum;

    @ApiProperty({
        description: "Filter by auto invited status",
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined ? undefined : value === "true" || value === true
    )
    auto_invited?: boolean;

    @ApiProperty({
        description: "Filter by auto shortlisted status",
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined ? undefined : value === "true" || value === true
    )
    auto_shortlisted?: boolean;

    @ApiProperty({
        description: "Filter by auto denied status",
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined ? undefined : value === "true" || value === true
    )
    auto_denied?: boolean;
}

