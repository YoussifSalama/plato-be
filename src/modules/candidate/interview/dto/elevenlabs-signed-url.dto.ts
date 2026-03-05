import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class ElevenLabsSignedUrlDto {
    @ApiPropertyOptional({
        description: "Override ElevenLabs agent id for this request",
        example: "agent_123",
    })
    @IsOptional()
    @IsString()
    agent_id?: string;

    @ApiPropertyOptional({
        description: "Interview session id for observability correlation",
        example: 15,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    interview_session_id?: number;

    @ApiPropertyOptional({
        description: "Request one-time conversation id in signed URL response",
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    include_conversation_id?: boolean;
}
