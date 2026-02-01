import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateJobDto {
    @ApiPropertyOptional({ example: "Business Development Manager" })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ example: "remote" })
    @IsOptional()
    @IsString()
    workplace_type?: string;

    @ApiPropertyOptional({ example: "full_time" })
    @IsOptional()
    @IsString()
    employment_type?: string;

    @ApiPropertyOptional({ example: "mid_level" })
    @IsOptional()
    @IsString()
    seniority_level?: string;

    @ApiPropertyOptional({ example: "technology" })
    @IsOptional()
    @IsString()
    industry?: string;

    @ApiPropertyOptional({ example: "Cairo, Egypt" })
    @IsOptional()
    @IsString()
    location?: string;

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

    @ApiPropertyOptional({ example: "usd" })
    @IsOptional()
    @IsString()
    salary_currency?: string;

    @ApiPropertyOptional({ example: 1200 })
    @IsOptional()
    @IsNumber()
    salary_from?: number;

    @ApiPropertyOptional({ example: 2000 })
    @IsOptional()
    @IsNumber()
    salary_to?: number;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    is_salary_negotiable?: boolean;

    @ApiPropertyOptional({ example: "Role overview and responsibilities." })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: "3+ years of sales experience." })
    @IsOptional()
    @IsString()
    requirements?: string;

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

