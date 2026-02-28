import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class RealtimeMetricsDto {
    @IsDateString()
    started_at: string;

    @IsDateString()
    ended_at: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    interview_session_id?: number | null;

    @IsString()
    language: string;

    @IsString()
    realtime_model: string;

    @IsString()
    transcription_model: string;

    @IsInt()
    @Min(0)
    ai_turns: number;

    @IsInt()
    @Min(0)
    candidate_turns: number;

    @IsInt()
    @Min(0)
    silence_chains_started: number;

    @IsInt()
    @Min(0)
    silence_nudges_sent: number;

    @IsInt()
    @Min(0)
    silence_repeats_sent: number;

    @IsInt()
    @Min(0)
    silence_resolve_prompts_sent: number;

    @IsInt()
    @Min(0)
    transcript_repair_prompts_sent: number;

    @IsInt()
    @Min(0)
    empty_candidate_transcripts: number;

    @IsInt()
    @Min(0)
    no_audio_retries: number;

    @IsInt()
    @Min(0)
    connection_failures: number;

    @IsOptional()
    @IsString()
    last_failure_reason?: string;

    @IsString()
    reason: string;
}
