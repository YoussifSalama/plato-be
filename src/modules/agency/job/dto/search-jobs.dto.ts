import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class SearchJobsDto {
    @ApiPropertyOptional({ description: "Partial match for job title/location" })
    @IsOptional()
    @IsString()
    partial_matching?: string;

    @ApiPropertyOptional({ description: "Max results", example: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
    limit?: number;
}

