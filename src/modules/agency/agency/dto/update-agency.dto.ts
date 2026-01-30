import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class UpdateAgencyDto {
    @ApiPropertyOptional({ description: "Company name", example: "Plato Hiring" })
    @IsOptional()
    @IsString()
    company_name?: string;

    @ApiPropertyOptional({ description: "Organization URL", example: "https://plato.example.com" })
    @IsOptional()
    @IsUrl()
    organization_url?: string;

    @ApiPropertyOptional({ description: "Company size", example: "50-100" })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    company_size?: string;

    @ApiPropertyOptional({ description: "Company industry", example: "Technology" })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    company_industry?: string;

    @ApiPropertyOptional({ description: "Company description" })
    @IsOptional()
    @IsString()
    company_description?: string;
}

