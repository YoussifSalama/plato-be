import { BadRequestException, Body, Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CandidateJwtAuthGuard } from "src/shared/guards/candidate-jwt-auth.guard";
import { CandidateOrSessionJwtAuthGuard } from "src/shared/guards/candidate-or-session-jwt-auth.guard";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { AccessTokenPayload } from "src/shared/types/services/jwt.types";
import { InterviewService } from "./interview.service";
import { ElevenLabsService } from "./elevenlabs.service";
import { CancelInterviewDto } from "./dto/cancel-interview.dto";
import { AppendQaLogDto } from "./dto/append-qa-log.dto";
import { StartInterviewDto } from "./dto/start-interview.dto";
import { CompleteInterviewDto } from "./dto/complete-interview.dto";
import { PhaseCompleteDto } from "./dto/phase-complete.dto";
import { PostponeInterviewDto } from "./dto/postpone-interview.dto";
import { RealtimeMetricsDto } from "./dto/realtime-metrics.dto";
import { ModalDismissedDto } from "./dto/modal-dismissed.dto";
import { ElevenLabsSignedUrlDto } from "./dto/elevenlabs-signed-url.dto";
import { CreateMultipartUploadDto } from "./dto/create-multipart-upload.dto";
import { CompleteMultipartUploadDto } from "./dto/complete-multipart-upload.dto";
import { GeneratePresignedUrlDto } from "./dto/generate-presigned-url.dto";
import { GeneratePresignedPartUrlDto } from "./dto/generate-presigned-part-url.dto";
import {
    extractInterviewSessionIdFromWebhookPayload,
    verifyElevenLabsWebhookSignature,
} from "./elevenlabs-webhook.util";
import { AwsS3Service } from "src/shared/helpers/aws/s3/s3.service";
import { ConfigService } from "@nestjs/config";

@ApiTags("Interview")
@Controller("interview")
export class InterviewController {
    private readonly logger = new Logger(InterviewController.name);

    constructor(
        private readonly interviewService: InterviewService,
        private readonly elevenLabsService: ElevenLabsService,
        private readonly s3Service: AwsS3Service,
        private readonly configService: ConfigService,
    ) { }

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
        schema: { type: "string", enum: ["active", "expired", "revoked", "all", "in_use", "invalid"] },
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
        @Query("status") status?: "active" | "expired" | "revoked" | "all" | "in_use" | "invalid",
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "Create interview resources from invitation token" })
    @ApiParam({ name: "token", example: "invitation-token" })
    @ApiQuery({
        name: "language",
        required: false,
        schema: { type: "string", enum: ["ar", "en"] },
        example: "ar",
    })
    async createInterviewResources(
        @Req() req: { user: AccessTokenPayload },
        @Param("token") token: string,
        @Query("language") language?: "ar" | "en"
    ) {
        const selectedLanguage =
            language === "en" || language === "ar" ? language : undefined;
        const startedAt = Date.now();
        this.logger.log(`resources.start token=${token} lang=${selectedLanguage ?? "auto"}`);
        try {
            const result = await this.interviewService.createInterviewResources(
                token,
                selectedLanguage,
                req.user.id
            );
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Start interview session (realtime flow)" })
    async startInterview(@Req() req: { user: AccessTokenPayload }, @Body() body: StartInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`start.start token_id=${body.interview_token}`);
        try {
            const result = await this.interviewService.startInterviewSession(
                body.interview_token,
                req.user.id
            );
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Cancel interview session" })
    async cancelInterview(@Req() req: { user: AccessTokenPayload }, @Body() body: CancelInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`cancel.start session=${body.interview_session_id}`);
        try {
            const result = await this.interviewService.cancelInterviewSession(
                body.interview_session_id,
                req.user.id
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

    @Post("phase-complete")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Mark interview phase as complete" })
    async phaseComplete(@Req() req: { user: AccessTokenPayload }, @Body() body: PhaseCompleteDto) {
        const startedAt = Date.now();
        this.logger.log(`phase-complete.start session=${body.interview_session_id}`);
        try {
            const result = await this.interviewService.phaseComplete(
                body.interview_session_id,
                req.user.id
            );
            this.logger.log(
                `phase-complete.done session=${body.interview_session_id} ms=${Date.now() - startedAt}`
            );
            return result;
        } catch (error) {
            this.logger.error(
                `phase-complete.failed session=${body.interview_session_id} ms=${Date.now() - startedAt}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error;
        }
    }

    @Post("complete")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Complete interview session" })
    async completeInterview(@Req() req: { user: AccessTokenPayload }, @Body() body: CompleteInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`complete.start session=${body.interview_session_id}`);
        try {
            const result = await this.interviewService.completeInterviewSession(
                body.interview_session_id,
                req.user.id
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Get generated candidate profile for interview session" })
    @ApiParam({ name: "interviewSessionId", example: 123 })
    async getGeneratedProfile(
        @Req() req: { user: AccessTokenPayload },
        @Param("interviewSessionId") interviewSessionId: string
    ) {
        const startedAt = Date.now();
        this.logger.log(`generated-profile.start session=${interviewSessionId}`);
        try {
            const result = await this.interviewService.getGeneratedProfile(
                Number(interviewSessionId),
                req.user.id
            );
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Postpone interview session" })
    async postponeInterview(@Req() req: { user: AccessTokenPayload }, @Body() body: PostponeInterviewDto) {
        const startedAt = Date.now();
        this.logger.log(`postpone.start session=${body.interview_session_id}`);
        try {
            const result = await this.interviewService.postponeInterviewSession(
                body.interview_session_id,
                body.mode,
                body.scheduled_for,
                body.scheduled_for_date,
                req.user.id
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Append interview QA log entry" })
    async appendQaLog(@Req() req: { user: AccessTokenPayload }, @Body() body: AppendQaLogDto) {
        const startedAt = Date.now();
        this.logger.log(`qa-log.start session=${body.interview_session_id} role=${body.role}`);
        try {
            const result = await this.interviewService.appendQaLogEntry(
                body.interview_session_id,
                body.role,
                body.content,
                req.user.id
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Track cancel/postpone modal close without confirmation" })
    async trackModalDismissed(@Req() req: { user: AccessTokenPayload }, @Body() body: ModalDismissedDto) {
        const startedAt = Date.now();
        this.logger.log(
            `modal-dismissed.start session=${body.interview_session_id} type=${body.modal_type}`
        );
        try {
            const result = await this.interviewService.trackModalDismissed(
                body.interview_session_id,
                body.modal_type,
                req.user.id
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Get ElevenLabs signed WebSocket URL" })
    async getElevenLabsSignedUrl(
        @Req() req: { user: AccessTokenPayload },
        @Body() body: ElevenLabsSignedUrlDto
    ) {
        const startedAt = Date.now();
        this.logger.log(
            `elevenlabs-signed-url.start agent=${body.agent_id ?? "default"} session=${body.interview_session_id ?? "none"}`
        );
        try {
            if (body.interview_session_id) {
                await this.interviewService.assertSessionOwnedByCandidate(
                    body.interview_session_id,
                    req.user.id
                );
            }
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
                    candidateId: req.user.id,
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Collect realtime interview quality metrics" })
    async collectRealtimeMetrics(@Req() req: { user: AccessTokenPayload }, @Body() body: RealtimeMetricsDto) {
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
        await this.interviewService.recordRealtimeMetrics(body, req.user.id);
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
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Get deterministic ElevenLabs session context" })
    async getSessionContext(
        @Req() req: { user: AccessTokenPayload },
        @Param("interviewSessionId") interviewSessionId: string
    ) {
        return this.interviewService.buildElevenLabsSessionContext(
            Number(interviewSessionId),
            req.user.id
        );
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

    @Post("s3/create-multipart-upload")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Create multipart upload" })
    async createMultipartUpload(
        @Req() req: { user: AccessTokenPayload },
        @Body() body: CreateMultipartUploadDto
    ) {
        const match = /^interviews\/(\d+)\//.exec(body.key);
        if (match) {
            await this.interviewService.assertSessionOwnedByCandidate(
                Number(match[1]),
                req.user.id
            );
        }
        const bucketName = this.configService.get<string>("env.s3.bucket");
        if (!bucketName) {
            throw new BadRequestException("Bucket name is required");
        }
        return this.s3Service.createMultipartUpload(bucketName, body.key);
    }

    @Post("s3/generate-presigned-url")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Generate presigned URL" })
    async generatePresignedUrl(
        @Req() req: { user: AccessTokenPayload },
        @Body() body: GeneratePresignedUrlDto
    ) {
        const match = /^interviews\/(\d+)\//.exec(body.key);
        if (match) {
            await this.interviewService.assertSessionOwnedByCandidate(
                Number(match[1]),
                req.user.id
            );
        }
        const bucketName = this.configService.get<string>("env.s3.bucket");
        if (!bucketName) {
            throw new BadRequestException("Bucket name is required");
        }
        return this.s3Service.generatePresignedUrl(bucketName, body.key);
    }

    @Post("s3/generate-presigned-part-url")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Generate presigned URL for multipart upload part" })
    async generatePresignedPartUrl(
        @Req() req: { user: AccessTokenPayload },
        @Body() body: GeneratePresignedPartUrlDto
    ) {
        const match = /^interviews\/(\d+)\//.exec(body.key);
        if (match) {
            await this.interviewService.assertSessionOwnedByCandidate(
                Number(match[1]),
                req.user.id
            );
        }
        const bucketName = this.configService.get<string>("env.s3.bucket");
        if (!bucketName) {
            throw new BadRequestException("Bucket name is required");
        }
        return this.s3Service.generatePresignedPartUrl(bucketName, body.key, body.uploadId, body.partNumber);
    }

    @Post("s3/complete-multipart-upload")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateOrSessionJwtAuthGuard)
    @ApiOperation({ summary: "Complete multipart upload" })
    async completeMultipartUpload(
        @Req() req: { user: AccessTokenPayload },
        @Body() body: CompleteMultipartUploadDto
    ) {
        const result = await this.s3Service.completeMultipartUpload(
            body.bucketName,
            body.key,
            body.uploadId,
            body.parts,
        );
        const match = /^interviews\/(\d+)\//.exec(body.key);
        if (match) {
            const sessionId = Number(match[1]);
            await this.interviewService.assertSessionOwnedByCandidate(sessionId, req.user.id);
            const bucket = this.configService.get<string>("env.s3.bucket");
            const region = this.configService.get<string>("env.s3.region") ?? "eu-central-1";
            const recordUrl = `https://${bucket}.s3.${region}.amazonaws.com/${body.key}`;
            await this.interviewService.updateInterviewSessionRecord(sessionId, recordUrl);
        }
        return result;
    }
}