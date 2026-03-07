import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class EnhanceResumePromptDto {
    @ApiProperty({
        description: "The raw AI prompt text to enhance",
        example: "[deny] candidate does not have Next.js\n[shortlist] candidate has 3+ years of React",
    })
    @IsString()
    @MinLength(1)
    prompt: string;

    @ApiPropertyOptional({
        description: "Job ID to include job context in the enhancement",
        example: 42,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    job_id?: number;
}
