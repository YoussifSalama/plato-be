import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GenerateJobAiDto {
    @ApiProperty({ example: "Full Stack Engineer" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: "senior" })
    @IsString()
    @IsNotEmpty()
    seniority_level?: string;

    @ApiProperty({ example: "software" })
    @IsString()
    @IsNotEmpty()
    industry?: string;

    @ApiProperty({ example: "full_time" })
    @IsString()
    @IsNotEmpty()
    employment_type?: string;

    @ApiProperty({ example: "remote" })
    @IsString()
    @IsNotEmpty()
    workplace_type?: string;

    @ApiProperty({ example: "Cairo, Egypt" })
    @IsString()
    @IsNotEmpty()
    location?: string;

    @ApiPropertyOptional({ isArray: true, example: ["React", "Node.js"] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    technical_skills?: string[];

    @ApiPropertyOptional({ isArray: true, example: ["communication", "teamwork"] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    soft_skills?: string[];

    @ApiPropertyOptional({ example: "description" })
    @IsOptional()
    @IsString()
    @IsIn(["description", "requirements", "both"])
    target?: "description" | "requirements" | "both";
}

