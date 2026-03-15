import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ApplicationDocumentDto {
    @IsString()
    name: string;

    @IsString()
    link: string;
}

export class ApplyJobDto {
    @ApiPropertyOptional({ type: [ApplicationDocumentDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ApplicationDocumentDto)
    documents?: ApplicationDocumentDto[];
}
