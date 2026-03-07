import { Body, Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CandidateJwtAuthGuard } from "src/shared/guards/candidate-jwt-auth.guard";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { AccessTokenPayload } from "src/shared/types/services/jwt.types";
import { InterviewService } from "./interview.service";
import { ElevenLabsService } from "./elevenlabs.service";
import { CancelInterviewDto } from "./dto/cancel-interview.dto";
import { AppendQaLogDto } from "./dto/append-qa-log.dto";
import { StartInterviewDto } from "./dto/start-interview.dto";
import { CompleteInterviewDto } from "./dto/complete-interview.dto";
import { PostponeInterviewDto } from "./dto/postpone-interview.dto";
import { RealtimeMetricsDto } from "./dto/realtime-metrics.dto";
import { ModalDismissedDto } from "./dto/modal-dismissed.dto";
import { ElevenLabsSignedUrlDto } from "./dto/elevenlabs-signed-url.dto";
import {
    extractInterviewSessionIdFromWebhookPayload,
    verifyElevenLabsWebhookSignature,
} from "./elevenlabs-webhook.util";

@ApiTags("Interview")
@Controller("interview")
export class InterviewController {
    private readonly logger = new Logger(InterviewController.name);

    constructor(
        private readonly interviewService: InterviewService,
        private readonly elevenLabsService: ElevenLabsService
    ) {}

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

    @Get("generated-profile/:interviewSessionId")
    @ApiOperation({ summary: "Get generated candidate profile for interview session" })
    @ApiParam({ name: "interviewSessionId", example: 123 })
    async getGeneratedProfile(@Param("interviewSessionId") interviewSessionId: string) {
        const startedAt = Date.now();
        this.logger.log(`generated-profile.start session=${interviewSessionId}`);
        try {
            const result = await this.interviewService.getGeneratedProfile(Number(interviewSessionId));
            this.logger.log(
                `generated-profile.done session=${interviewSessionId} ms=${Date.now() - startedAt}`
            );
            return result;
        } catch (error) {
            this.logger.error(
                `generated-profile.failed session=${interviewSessionId} ms=${Date.now() - startedAt}`,
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
                body.scheduled_for,
                body.scheduled_for_date
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

    @Post("modal-dismissed")
    @ApiOperation({ summary: "Track cancel/postpone modal close without confirmation" })
    async trackModalDismissed(@Body() body: ModalDismissedDto) {
        const startedAt = Date.now();
        this.logger.log(
            `modal-dismissed.start session=${body.interview_session_id} type=${body.modal_type}`
        );
        try {
            const result = await this.interviewService.trackModalDismissed(
                body.interview_session_id,
                body.modal_type
            );
            this.logger.log(
                `modal-dismissed.done session=${body.interview_session_id} ms=${Date.now() - startedAt}`
            );
            return result;
        } catch (error) {
            this.logger.error(
                `modal-dismissed.failed session=${body.interview_session_id} ms=${Date.now() - startedAt}`,
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

    @Post("elevenlabs-signed-url")
    @ApiOperation({ summary: "Get ElevenLabs signed WebSocket URL" })
    async getElevenLabsSignedUrl(@Body() body: ElevenLabsSignedUrlDto) {
        const startedAt = Date.now();
        this.logger.log(
            `elevenlabs-signed-url.start agent=${body.agent_id ?? "default"} session=${body.interview_session_id ?? "none"}`
        );
        try {
            const result = await this.elevenLabsService.getSignedUrl({
                agentId: body.agent_id,
                includeConversationId: body.include_conversation_id,
                interviewSessionId: body.interview_session_id,
                language: body.language,
            });
            if (
                body.interview_session_id &&
                typeof result.conversation_id === "string" &&
                result.conversation_id
            ) {
                await this.interviewService.recordElevenLabsConversationMapping({
                    interviewSessionId: body.interview_session_id,
                    conversationId: result.conversation_id,
                    agentId: result.agent_id,
                });
            }
            this.logger.log(`elevenlabs-signed-url.done ms=${Date.now() - startedAt}`);
            return result;
        } catch (error) {
            this.logger.error(
                `elevenlabs-signed-url.failed ms=${Date.now() - startedAt}`,
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
        await this.interviewService.recordRealtimeMetrics(body);
        return { ok: true };
    }

    @Post("elevenlabs/post-call-webhook")
    @ApiOperation({ summary: "Receive ElevenLabs post-call webhook events" })
    async handleElevenLabsPostCallWebhook(
        @Req()
        req: {
            body: Record<string, unknown>;
            headers: Record<string, string | string[] | undefined>;
            rawBody?: Buffer;
        }
    ) {
        const payload = req.body ?? {};
        const signatureHeaderValue = req.headers["elevenlabs-signature"];
        const signatureHeader =
            typeof signatureHeaderValue === "string"
                ? signatureHeaderValue
                : Array.isArray(signatureHeaderValue)
                    ? signatureHeaderValue[0]
                    : "";
        const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET ?? "";

        if (webhookSecret) {
            const payloadText = req.rawBody?.toString("utf8") ?? JSON.stringify(payload);
            const isValid = verifyElevenLabsWebhookSignature({
                payload: payloadText,
                signatureHeader,
                secret: webhookSecret,
            });
            if (!isValid) {
                this.logger.warn("elevenlabs.post-call-webhook.invalid_signature");
                return { ok: false, error: "invalid signature" };
            }
        }

        const interviewSessionId = extractInterviewSessionIdFromWebhookPayload(payload);
        await this.interviewService.processElevenLabsPostCallWebhook({
            payload,
            interviewSessionId,
        });

        this.logger.log(
            [
                "elevenlabs.post-call-webhook.accepted",
                `type=${typeof payload.type === "string" ? payload.type : "unknown"}`,
                `session=${interviewSessionId ?? "none"}`,
            ].join(" ")
        );
        return { ok: true };
    }

    @Get("session-context/:interviewSessionId")
    @ApiOperation({ summary: "Get deterministic ElevenLabs session context" })
    async getSessionContext(@Param("interviewSessionId") interviewSessionId: string) {
        return this.interviewService.buildElevenLabsSessionContext(Number(interviewSessionId));
    }

    @Get("elevenlabs/agents")
    @ApiOperation({ summary: "List ElevenLabs agents from backend-owned API key" })
    async listElevenLabsAgents(
        @Query("page_size") pageSize?: string,
        @Query("search") search?: string,
        @Query("archived") archived?: string,
        @Query("cursor") cursor?: string
    ) {
        return this.elevenLabsService.listAgents({
            pageSize: pageSize ? Number(pageSize) : undefined,
            search,
            archived: archived === undefined ? undefined : archived === "true",
            cursor,
            showOnlyOwnedAgents: true,
        });
    }

    @Post("elevenlabs/agents")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Create ElevenLabs agent from backend" })
    async createElevenLabsAgent(@Body() body: Record<string, unknown>) {
        return this.elevenLabsService.createAgent(body);
    }

    @Post("elevenlabs/agents/:agentId/update")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Update ElevenLabs agent from backend" })
    async updateElevenLabsAgent(
        @Param("agentId") agentId: string,
        @Body() body: Record<string, unknown>
    ) {
        return this.elevenLabsService.updateAgent(agentId, body);
    }
}