import { ApiProperty } from "@nestjs/swagger";
import { IsInstance, IsInt, IsNotEmpty, IsOptional, Min } from "class-validator";

export class InterviewStartDto {

    @ApiProperty({
        description: "Interview token id (optional for authenticated sessions)",
        example: 456,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    interview_token: number;
}

export class InterviewEndDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;
}

export class InterviewAnswerEndDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;

    @ApiProperty({ description: "Answer group index (1-based)", example: 1, required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    group_index?: number;
}

export class InterviewAddChunkDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;

    @ApiProperty({ description: "Answer group index (1-based)", example: 1, required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    group_index?: number;

    @ApiProperty({ description: "Audio chunk payload", type: "string", format: "binary" })
    @IsNotEmpty()
    @IsInstance(Buffer)
    chunk: Buffer;
}