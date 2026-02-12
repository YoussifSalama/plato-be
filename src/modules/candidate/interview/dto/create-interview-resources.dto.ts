import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

export enum InterviewLanguage {
    ar = "ar",
    en = "en",
}

export class CreateInterviewResourcesDto {
    @ApiProperty({
        example: "en",
        enum: InterviewLanguage,
    })
    @IsNotEmpty()
    @IsEnum(InterviewLanguage)
    language: InterviewLanguage;
}