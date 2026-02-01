import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateJobDto {
    @ApiProperty({ example: "Business Development Manager" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: "remote" })
    @IsString()
    @IsNotEmpty()
    workplace_type: string;

    @ApiProperty({ example: "full_time" })
    @IsString()
    @IsNotEmpty()
    employment_type: string;

    @ApiProperty({ example: "mid_level" })
    @IsString()
    @IsNotEmpty()
    seniority_level: string;

    @ApiProperty({ example: "technology" })
    @IsString()
    @IsNotEmpty()
    industry: string;

    @ApiProperty({ example: "Cairo, Egypt" })
    @IsString()
    @IsNotEmpty()
    location: string;

    @ApiPropertyOptional({ example: 75 })
    @IsOptional()
    @IsInt()
    @Min(0)
    auto_score_matching_threshold?: number;

    @ApiPropertyOptional({ example: 80 })
    @IsOptional()
    @IsInt()
    @Min(0)
    auto_email_invite_threshold?: number;

    @ApiPropertyOptional({ example: 85 })
    @IsOptional()
    @IsInt()
    @Min(0)
    auto_shortlisted_threshold?: number;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsInt()
    @Min(0)
    auto_denied_threshold?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiProperty({ example: "usd" })
    @IsString()
    @IsNotEmpty()
    salary_currency: string;

    @ApiProperty({ example: 1200 })
    @IsNumber()
    salary_from: number;

    @ApiProperty({ example: 2000 })
    @IsNumber()
    salary_to: number;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    is_salary_negotiable?: boolean;

    @ApiProperty({ example: "Role overview and responsibilities." })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: "3+ years of sales experience." })
    @IsString()
    @IsNotEmpty()
    requirements: string;

    @ApiPropertyOptional({ example: "PMP, Scrum Master" })
    @IsOptional()
    @IsString()
    certifications?: string;

    @ApiPropertyOptional({ example: "About the company and mission." })
    @IsOptional()
    @IsString()
    company_overview?: string;

    @ApiPropertyOptional({ example: "What this role owns and impacts." })
    @IsOptional()
    @IsString()
    role_overview?: string;

    @ApiPropertyOptional({ example: "Key responsibilities and day-to-day tasks." })
    @IsOptional()
    @IsString()
    responsibilities?: string;

    @ApiPropertyOptional({ example: "Nice to have skills or experience." })
    @IsOptional()
    @IsString()
    nice_to_have?: string;

    @ApiPropertyOptional({ example: "What we offer to candidates." })
    @IsOptional()
    @IsString()
    what_we_offer?: string;

    @ApiPropertyOptional({ example: "Benefits and perks." })
    @IsOptional()
    @IsString()
    job_benefits?: string;

    @ApiPropertyOptional({ isArray: true, example: ["communication", "leadership"] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    soft_skills?: string[];

    @ApiPropertyOptional({ isArray: true, example: ["CRM", "Salesforce"] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    technical_skills?: string[];

    @ApiPropertyOptional({ isArray: true, example: ["arabic", "english"] })
    @IsOptional()
    @IsArray()
    languages?: unknown[];
}

