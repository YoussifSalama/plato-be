import { IsOptional, IsString } from "class-validator";

export class TranscribeDto {
    @IsOptional()
    @IsString()
    language?: string;
}

