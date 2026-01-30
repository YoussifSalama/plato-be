import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ShortlistResumeDto {
    @ApiProperty({ description: "Set auto shortlisted status", example: true })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined ? undefined : value === "true" || value === true
    )
    auto_shortlisted?: boolean;
}

