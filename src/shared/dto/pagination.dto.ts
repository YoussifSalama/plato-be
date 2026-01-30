import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class paginationDto {
    @ApiProperty({
        description: 'The page number',
        example: 1,
    })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => Number(value) || 1)
    page?: number;

    @ApiProperty({
        description: 'The number of items per page',
        example: 10,
    })
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => Number(value) || 10)
    limit?: number;
}