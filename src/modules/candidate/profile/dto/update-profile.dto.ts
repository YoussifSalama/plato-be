import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested,
} from "class-validator";

export enum ProfileExperienceType {
    remote = "remote",
    hybrid = "hybrid",
    on_site = "on_site",
    full_time = "full_time",
    part_time = "part_time",
    contract = "contract",
    internship = "internship",
    freelance = "freelance",
    temporary = "temporary",
    volunteer = "volunteer",
};

export class UpdateProfileExperienceDto {
    @ApiProperty({ example: "Acme Corp" })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    company_name: string;

    @ApiPropertyOptional({ type: String, format: "date-time", example: "2022-01-01T00:00:00.000Z" })
    @IsDate()
    @IsOptional()
    @Transform(({ value }) => new Date(value))
    from?: Date;

    @ApiPropertyOptional({ type: String, format: "date-time", example: "2023-06-01T00:00:00.000Z" })
    @IsDate()
    @IsOptional()
    @Transform(({ value }) => value ? new Date(value) : null)
    to?: Date;

    @ApiProperty({ example: false })
    @IsBoolean()
    @IsNotEmpty()
    @Transform(({ value }) => value === true || value === "true")
    current: boolean;

    @ApiProperty({ example: "Senior Backend Engineer" })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    role: string;

    @ApiPropertyOptional({ example: "Worked on payment systems and scaling." })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: "Fintech" })
    @IsString()
    @IsNotEmpty()
    field: string;

    @ApiProperty({ enum: ProfileExperienceType, example: ProfileExperienceType.full_time })
    @IsEnum(ProfileExperienceType)
    @IsNotEmpty()
    type: ProfileExperienceType;
}

export class UpdateProfileProjectDto {
    @ApiProperty({ example: "Hiring Platform" })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    name: string;

    @ApiPropertyOptional({ example: "Built a candidate tracking system." })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: "Full-stack Developer" })
    @IsString()
    @IsNotEmpty()
    role: string;
}

export class UpdateProfileSocialLinkDto {
    @ApiProperty({ example: "linkedin" })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    key: string;

    @ApiProperty({ example: "https://www.linkedin.com/in/username" })
    @IsString()
    @IsNotEmpty()
    @IsUrl({ require_tld: false })
    value: string;
}

export class UpdateProfileBasicDto {
    @ApiPropertyOptional({ example: "Senior Software Engineer" })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.trim())
    headline?: string;

    @ApiPropertyOptional({ example: "Backend-focused engineer with 7 years of experience." })
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional({ example: "Cairo, Egypt" })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.trim())
    location?: string;
}

export class UpdateProfileExperiencesDto {
    @ApiPropertyOptional({ type: [UpdateProfileExperienceDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateProfileExperienceDto)
    experiences?: UpdateProfileExperienceDto[];
}

export class UpdateProfileProjectsDto {
    @ApiPropertyOptional({ type: [UpdateProfileProjectDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateProfileProjectDto)
    projects?: UpdateProfileProjectDto[];
}

export class UpdateProfileSocialLinksDto {
    @ApiPropertyOptional({ type: [UpdateProfileSocialLinkDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateProfileSocialLinkDto)
    social_links?: UpdateProfileSocialLinkDto[];
}

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: "Senior Software Engineer" })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.trim())
    headline?: string;

    @ApiPropertyOptional({ example: "Backend-focused engineer with 7 years of experience." })
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional({ example: "Cairo, Egypt" })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value.trim())
    location?: string;

    @ApiPropertyOptional({ type: [UpdateProfileExperienceDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateProfileExperienceDto)
    experiences?: UpdateProfileExperienceDto[];

    @ApiPropertyOptional({ type: [UpdateProfileProjectDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateProfileProjectDto)
    projects?: UpdateProfileProjectDto[];

    @ApiPropertyOptional({ type: [UpdateProfileSocialLinkDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateProfileSocialLinkDto)
    social_links?: UpdateProfileSocialLinkDto[];
}