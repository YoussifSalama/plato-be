import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class DenyResumeDto {
    @ApiProperty({ description: "Set auto denied status", example: true })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined ? undefined : value === "true" || value === true
    )
    auto_denied?: boolean;
}

