import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class GetResumeDetailsDto {
    @ApiProperty({
        description: "Resume id",
        example: 180,
    })
    @IsInt()
    @Min(1)
    @Transform(({ value }) => Number(value))
    id: number;
}

