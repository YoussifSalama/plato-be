import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";

class Evaluation {
    @ApiProperty({ example: "name" })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: "John Doe" })
    @IsString()
    @IsNotEmpty()
    value: string;
}

export class CreateJobAiPromptDto {
    @ApiProperty({ example: "resume" })
    @IsString()
    @IsNotEmpty()
    target: string;

    @ApiProperty({ example: "Please extract the name from the resume." })
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @ApiProperty({ example: [{ key: "name", value: "John Doe" }] })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => Evaluation)
    evaluation: Evaluation[];
}

