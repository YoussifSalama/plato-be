import { Body, Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CandidateJwtAuthGuard } from "src/shared/guards/candidate-jwt-auth.guard";
import { AccessTokenPayload } from "src/shared/types/services/jwt.types";
import { InterviewService } from "./interview.service";
import { CancelInterviewDto } from "./dto/cancel-interview.dto";
import { AppendQaLogDto } from "./dto/append-qa-log.dto";
import { StartInterviewDto } from "./dto/start-interview.dto";
import { CompleteInterviewDto } from "./dto/complete-interview.dto";
import { PostponeInterviewDto } from "./dto/postpone-interview.dto";
import { RealtimeMetricsDto } from "./dto/realtime-metrics.dto";

@ApiTags("Interview")
@Controller("interview")
export class InterviewController {
    private readonly logger = new Logger(InterviewController.name);

    constructor(private readonly interviewService: InterviewService) { }

    @Get()
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "List candidate interviews" })
    @ApiQuery({ name: "page", required: false, example: 1 })
    @ApiQuery({ name: "limit", required: false, example: 10 })
    @ApiQuery({
        name: "sortBy",
        required: false,
        schema: { type: "string", enum: ["created_at", "expires_at"] },
        example: "expires_at",
    })
    @ApiQuery({
        name: "sortOrder",
        required: false,
        schema: { type: "string", enum: ["asc", "desc"] },
        example: "desc",
    })
    @ApiQuery({
        name: "status",
        required: false,
        schema: { type: "string", enum: ["active", "expired", "revoked", "all"] },
        example: "active",
    })
    @ApiQuery({
        name: "search",
        required: false,
        schema: { type: "string" },
        example: "frontend",
    })
    async listCandidateInterviews(
        @Req() req: { user: AccessTokenPayload },
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("sortBy") sortBy?: "created_at" | "expires_at",
        @Query("sortOrder") sortOrder?: "asc" | "desc",
        @Query("status") status?: "active" | "expired" | "revoked" | "all",
        @Query("search") search?: string
    ) {
        return this.interviewService.listCandidateInterviews(req.user.id, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy,
            sortOrder,
            status,
            search,
        });
    }

    @Post("resources/:token")
    @ApiOperation({ summary: "Create interview resources from invitation token" })
    @ApiParam({ name: "token", example: "invitation-token" })
    @ApiQuery({
        name: "language",
        required: false,
        schema: { type: "string", enum: ["ar", "en"] },
        example: "ar",
    })
    async createInterviewResources(
        @Param("token") token: string,
        @Query("language") language?: "ar" | "en"
    ) {
        const selectedLanguage =
            language === "en" || language === "ar" ? language : undefined;
        const startedAt = Date.now();
        this.logger.log(`resources.start token=${token} lang=${selectedLanguage ?? "auto"}`);
        try {
            const result = await this.interviewService.createInterviewResources(token, selectedLanguage);
            this.logger.log(`resources.done token=${token} ms=${Date.now() - startedAt}`);
            return result;
        } catch (error) {
            this.logger.error(
                `resources.failed token=${token} ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("start")
    @ApiOperation({ summary: "Start interview session (realtime flow)" })
    async startInterview(@Body() body: StartInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`start.start token_id=${body.interview_token}`);
        try {
            const result = await this.interviewService.startInterviewSession(body.interview_token);
            this.logger.log(`start.done token_id=${body.interview_token} ms=${Date.now() - startedAt}`);
            return result;
        } catch (error) {
            this.logger.error(
                `start.failed token_id=${body.interview_token} ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("cancel")
    @ApiOperation({ summary: "Cancel interview session" })
    async cancelInterview(@Body() body: CancelInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`cancel.start session=${body.interview_session_id}`);
        try {
            const result = await this.interviewService.cancelInterviewSession(
                body.interview_session_id
            );
            this.logger.log(
                `cancel.done session=${body.interview_session_id} ms=${Date.now() - startedAt}`
            );
            return result;
        } catch (error) {
            this.logger.error(
                `cancel.failed session=${body.interview_session_id} ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("complete")
    @ApiOperation({ summary: "Complete interview session" })
    async completeInterview(@Body() body: CompleteInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`complete.start session=${body.interview_session_id}`);
        try {
            const result = await this.interviewService.completeInterviewSession(
                body.interview_session_id
            );
            this.logger.log(
                `complete.done session=${body.interview_session_id} ms=${Date.now() - startedAt}`
            );
            return result;
        } catch (error) {
            this.logger.error(
                `complete.failed session=${body.interview_session_id} ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("postpone")
    @ApiOperation({ summary: "Postpone interview session" })
    async postponeInterview(@Body() body: PostponeInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`postpone.start session=${body.interview_session_id}`);
        try {
            const result = await this.interviewService.postponeInterviewSession(
                body.interview_session_id,
                body.mode,
                body.scheduled_for
            );
            this.logger.log(
                `postpone.done session=${body.interview_session_id} ms=${Date.now() - startedAt}`
            );
            return result;
        } catch (error) {
            this.logger.error(
                `postpone.failed session=${body.interview_session_id} ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("qa-log")
    @ApiOperation({ summary: "Append interview QA log entry" })
    async appendQaLog(@Body() body: AppendQaLogDto) {
        const startedAt = Date.now();
        this.logger.log(`qa-log.start session=${body.interview_session_id} role=${body.role}`);
        try {
            const result = await this.interviewService.appendQaLogEntry(
                body.interview_session_id,
                body.role,
                body.content
            );
            this.logger.log(
                `qa-log.done session=${body.interview_session_id} ms=${Date.now() - startedAt}`
            );
            return result;
        } catch (error) {
            this.logger.error(
                `qa-log.failed session=${body.interview_session_id} ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("realtime/session")
    @ApiOperation({ summary: "Create OpenAI realtime session" })
    async createRealtimeSession(
        @Body()
        body: {
            model?: string;
            voice?: string;
            interview_session_id?: number;
        }
    ) {
        const startedAt = Date.now();
        this.logger.log(`realtime.start model=${body.model ?? "gpt-4o-realtime-preview"}`);
        try {
            const result = await this.interviewService.createRealtimeSession(
                body.model ?? "gpt-4o-realtime-preview",
                body.voice ?? "cedar"
            );
            this.logger.log(`realtime.done ms=${Date.now() - startedAt}`);
            return result;
        } catch (error) {
            this.logger.error(
                `realtime.failed ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("realtime/metrics")
    @ApiOperation({ summary: "Collect realtime interview quality metrics" })
    async collectRealtimeMetrics(@Body() body: RealtimeMetricsDto) {
        this.logger.log(
            [
                "realtime.metrics",
                `session=${body.interview_session_id ?? "none"}`,
                `lang=${body.language}`,
                `turns_ai=${body.ai_turns}`,
                `turns_candidate=${body.candidate_turns}`,
                `silence_chains=${body.silence_chains_started}`,
                `empty_transcripts=${body.empty_candidate_transcripts}`,
                `repair_prompts=${body.transcript_repair_prompts_sent}`,
                `failures=${body.connection_failures}`,
                `reason=${body.reason}`,
            ].join(" ")
        );
        return { ok: true };
    }
}