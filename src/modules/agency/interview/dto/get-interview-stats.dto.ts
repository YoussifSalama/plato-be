import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class GetInterviewStatsDto {
    @ApiProperty({ description: "Agency id", example: 12 })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
    agency_id?: number;
}
