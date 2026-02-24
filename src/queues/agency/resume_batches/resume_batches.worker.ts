import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { ResumeAiBatchStatus } from "@generated/prisma";
import { Batch } from "openai/resources";
import * as path from 'path';
import * as fs from 'fs';
import { InvitationService } from "src/modules/agency/invitation/invitation.service";
import { InboxService } from "src/modules/agency/inbox/inbox.service";
import { ensureUploadsDir } from "src/shared/helpers/storage/uploads-path";
import { OpenAiService } from "src/shared/services/openai.service";
import { AiCallProducer } from "../ai-call/ai-call.producer";

const batchOutputFolder = ensureUploadsDir("resumes_batches_output");

type JobThresholds = {
    agencyId: number;
    autoScoreMatchingThreshold: number | null;
    autoEmailInviteThreshold: number | null;
    autoShortlistedThreshold: number | null;
    autoDeniedThreshold: number | null;
};

type StructuredContact = {
    email?: string | null;
    phone?: string | null;
    Phone?: string | null;
    mobile?: string | null;
    Mobile?: string | null;
};

type StructuredData = {
    name?: string | null;
    contact?: StructuredContact | null;
    phone?: string | null;
    Phone?: string | null;
};

@Processor("resume_batches_pull_queue")
@Injectable()
export class ResumeBatchesWorker extends WorkerHost {
    private readonly logger = new Logger(ResumeBatchesWorker.name);
    private readonly jobThresholdCache = new Map<number, JobThresholds | null>();
    private readonly maxRetryAttempts = 2;

    constructor(
        private readonly prisma: PrismaService,
        private readonly invitationService: InvitationService,
        private readonly inboxService: InboxService,
        private readonly openaiService: OpenAiService,
        private readonly aiCallProducer: AiCallProducer,
    ) {
        super();
        this.logger.log("ResumeBatchesWorker initialized");
    }

    /** Get all batches not yet completed in DB */
    private async getAllNotCompletedBatchesFromDb() {
        return this.prisma.resumeProcessingBatch.findMany({
            where: { status: { notIn: [ResumeAiBatchStatus.completed] } }
        });
    }

    /** Download output file from OpenAI and parse JSONL */
    private async downloadBatchOutput(batch: Batch, projectIndex: number): Promise<any[]> {
        if (!batch.output_file_id) return [];

        try {
            const openai = this.openaiService.getClient(projectIndex);
            const res = await openai.files.content(batch.output_file_id);
            const text = await res.text();

            if (!fs.existsSync(batchOutputFolder)) {
                fs.mkdirSync(batchOutputFolder, { recursive: true });
            }
            fs.writeFileSync(path.join(batchOutputFolder, `${batch.id}.jsonl`), text);
            return text
                .split("\n")
                .filter(Boolean)
                .map(line => JSON.parse(line));
        } catch (err) {
            this.logger.error(`Failed to download output for batch ${batch.id} [Project ${projectIndex}]`, err as any);
            return [];
        }
    }

    private resolveBatchContext(aiMeta: unknown) {
        const meta = (aiMeta ?? {}) as Record<string, unknown>;
        const batchMeta = (meta.openai_batch ?? {}) as Record<string, unknown>;
        const metadata = (batchMeta.metadata ?? {}) as Record<string, unknown>;
        const agencyIdRaw =
            meta.agency_id ??
            meta.agencyId ??
            metadata.agency_id ??
            metadata.agencyId;
        const jobIdRaw =
            meta.job_id ??
            meta.jobId ??
            metadata.job_id ??
            metadata.jobId;
        const agencyId = typeof agencyIdRaw === "number" ? agencyIdRaw : Number(agencyIdRaw);
        const jobId = typeof jobIdRaw === "number" ? jobIdRaw : Number(jobIdRaw);
        return {
            agencyId: Number.isFinite(agencyId) ? agencyId : null,
            jobId: Number.isFinite(jobId) ? jobId : null,
        };
    }

    private async getBatchRecordByOpenAiId(batchId: string) {
        return this.prisma.resumeProcessingBatch.findUnique({
            where: { batch_id: batchId },
            select: {
                id: true,
                ai_meta: true,
                input_file_id: true,
                input_file_link: true,
                batch_id: true,
            },
        });
    }

    private resolveBatchContextFromSources(
        batch: Batch,
        aiMeta?: unknown,
    ) {
        const recordContext = aiMeta ? this.resolveBatchContext(aiMeta) : { agencyId: null, jobId: null };
        const metadata = (batch.metadata ?? {}) as Record<string, unknown>;
        const agencyId =
            recordContext.agencyId ??
            (typeof metadata.agency_id === "number" ? metadata.agency_id : Number(metadata.agency_id));
        const jobId =
            recordContext.jobId ??
            (typeof metadata.job_id === "number" ? metadata.job_id : Number(metadata.job_id));
        return {
            agencyId: Number.isFinite(agencyId) ? agencyId : null,
            jobId: Number.isFinite(jobId) ? jobId : null,
        };
    }

    private async retryFailedBatch(batch: Batch, projectIndex: number) {
        const record = await this.getBatchRecordByOpenAiId(batch.id);
        if (!record) {
            this.logger.warn(`ResumeProcessingBatch not found for retry (batchId=${batch.id}).`);
            return false;
        }
        const aiMeta = (record.ai_meta ?? {}) as Record<string, unknown>;
        const retryCount = typeof aiMeta.retry_count === "number" ? aiMeta.retry_count : 0;
        if (retryCount >= this.maxRetryAttempts) {
            this.logger.warn(`Retry limit reached for batch ${batch.id}.`);
            return false;
        }
        if (!record.input_file_id) {
            this.logger.warn(`Missing input_file_id for retry (batchId=${batch.id}).`);
            return false;
        }
        const context = this.resolveBatchContextFromSources(batch, record.ai_meta);
        const metadata: Record<string, string> = {
            retry_of: batch.id,
        };
        if (context.jobId) {
            metadata.job_id = String(context.jobId);
        }
        if (context.agencyId) {
            metadata.agency_id = String(context.agencyId);
        }

        const openai = this.openaiService.getClient(projectIndex);
        const newBatch = await openai.batches.create({
            input_file_id: record.input_file_id,
            endpoint: "/v1/chat/completions",
            completion_window: "24h",
            metadata,
        });
        const previousBatchIds = Array.isArray(aiMeta.previous_batch_ids)
            ? aiMeta.previous_batch_ids
            : [];
        await this.prisma.resumeProcessingBatch.update({
            where: { id: record.id },
            data: {
                batch_id: newBatch.id,
                output_file_id: null,
                status: ResumeAiBatchStatus.pending,
                ai_meta: {
                    ...aiMeta,
                    retry_count: retryCount + 1,
                    previous_batch_ids: [...previousBatchIds, batch.id],
                    openai_batch: JSON.parse(JSON.stringify(newBatch)),
                },
            },
        });
        this.logger.log(`Retried batch ${batch.id} -> ${newBatch.id} (attempt ${retryCount + 1}) [Project ${projectIndex}].`);
        return true;
    }

    private mapOpenAiStatus(status: Batch["status"]) {
        switch (status) {
            case "completed":
                return ResumeAiBatchStatus.completed;
            case "failed":
                return ResumeAiBatchStatus.failed;
            case "cancelled":
                return ResumeAiBatchStatus.cancelled;
            case "expired":
                return ResumeAiBatchStatus.expired;
            default:
                return null;
        }
    }

    /** Update batch metadata in DB */
    private async updateResumeAiBatch(batch: Batch, status: ResumeAiBatchStatus) {
        const batchMeta = JSON.parse(JSON.stringify(batch));
        const existing = await this.prisma.resumeProcessingBatch.findUnique({
            where: { batch_id: batch.id },
            select: { id: true, ai_meta: true },
        });
        if (!existing) {
            this.logger.warn(`ResumeProcessingBatch not found for batch ${batch.id}.`);
            return null;
        }
        const existingMeta = (existing.ai_meta ?? {}) as Record<string, unknown>;
        const updatedMeta = {
            ...existingMeta,
            openai_batch: batchMeta,
        };
        await this.prisma.resumeProcessingBatch.update({
            where: { batch_id: batch.id },
            data: {
                output_file_id: batch.output_file_id,
                status,
                ai_meta: updatedMeta,
            },
        });
        return { id: existing.id, ai_meta: updatedMeta };
    }

    private async createInboxForBatchStatus(
        batchRecord: { id: number; ai_meta: unknown } | null,
        status: ResumeAiBatchStatus,
        openAiBatchId?: string,
        context?: { agencyId?: number | null; jobId?: number | null },
    ) {
        if (!batchRecord) return;
        const { agencyId: metaAgencyId, jobId } = this.resolveBatchContext(batchRecord.ai_meta);
        const contextAgencyId = context?.agencyId ?? null;
        const contextJobId = context?.jobId ?? null;
        const resolvedJobId = Number.isFinite(contextJobId ?? NaN) ? contextJobId : jobId;
        let agencyId = Number.isFinite(contextAgencyId ?? NaN) ? contextAgencyId : metaAgencyId;
        if (!agencyId && resolvedJobId) {
            const thresholds = await this.getJobThresholds(resolvedJobId);
            agencyId = thresholds?.agencyId ?? null;
        }
        if (!agencyId) {
            this.logger.warn(
                `Missing agencyId for batch inbox (batchId=${batchRecord.id}, jobId=${resolvedJobId ?? "n/a"}).`,
            );
            return;
        }
        await this.inboxService.createBatchStatusInbox({
            agencyId,
            jobId: resolvedJobId ?? undefined,
            batchId: batchRecord.id,
            status,
            openAiBatchId,
        });
    }

    private async getJobThresholds(jobId: number): Promise<JobThresholds | null> {
        if (this.jobThresholdCache.has(jobId)) {
            return this.jobThresholdCache.get(jobId) ?? null;
        }
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            select: {
                agency_id: true,
                auto_score_matching_threshold: true,
                auto_email_invite_threshold: true,
                auto_shortlisted_threshold: true,
                auto_denied_threshold: true,
            },
        });
        if (!job) {
            this.jobThresholdCache.set(jobId, null);
            return null;
        }
        const thresholds = {
            agencyId: job.agency_id,
            autoScoreMatchingThreshold: job.auto_score_matching_threshold ?? null,
            autoEmailInviteThreshold: job.auto_email_invite_threshold ?? null,
            autoShortlistedThreshold: job.auto_shortlisted_threshold ?? null,
            autoDeniedThreshold: job.auto_denied_threshold ?? null,
        };
        this.jobThresholdCache.set(jobId, thresholds);
        return thresholds;
    }

    private async resolveRecipientContact(
        resumeId: number,
        structuredData: StructuredData | null,
    ) {
        const name = structuredData?.name ?? null;
        const email = structuredData?.contact?.email ?? null;
        if (email) {
            return { name, email, source: "structured_data" as const };
        }
        const structured = await this.prisma.resumeStructured.findUnique({
            where: { resume_id: resumeId },
            select: { data: true },
        });
        const data = structured?.data as StructuredData | null | undefined;
        return {
            name: name ?? data?.name ?? null,
            email: data?.contact?.email ?? null,
            source: data?.contact?.email ? ("resume_structured" as const) : ("missing" as const),
        };
    }

    private shouldApplyThreshold(score: number, threshold: number | null, comparison: "gte" | "lte") {
        if (threshold === null || threshold === undefined) {
            return false;
        }
        return comparison === "gte" ? score >= threshold : score <= threshold;
    }

    private async applyAutoActions(
        resume: { id: number; job_id: number; auto_invited: boolean; auto_shortlisted: boolean; auto_denied: boolean },
        score: number,
        structuredData: StructuredData | null,
    ) {
        const thresholds = await this.getJobThresholds(resume.job_id);
        if (!thresholds) {
            return;
        }

        const shouldAutoDenied = this.shouldApplyThreshold(
            score,
            thresholds.autoDeniedThreshold,
            "lte",
        );
        const shouldAutoShortlisted = !shouldAutoDenied && this.shouldApplyThreshold(
            score,
            thresholds.autoShortlistedThreshold,
            "gte",
        );
        const shouldAutoInvited = !shouldAutoDenied && this.shouldApplyThreshold(
            score,
            thresholds.autoEmailInviteThreshold,
            "gte",
        );

        const updates: {
            auto_denied?: boolean;
            auto_shortlisted?: boolean;
        } = {};

        if (shouldAutoDenied && !resume.auto_denied) {
            updates.auto_denied = true;
        }
        if (shouldAutoShortlisted && !resume.auto_shortlisted) {
            updates.auto_shortlisted = true;
        }

        if (Object.keys(updates).length > 0) {
            await this.prisma.resume.update({
                where: { id: resume.id },
                data: updates,
            });
        }

        if (!shouldAutoInvited || resume.auto_invited) {
            return;
        }

        const { email, name, source } = await this.resolveRecipientContact(resume.id, structuredData);
        if (!email) {
            this.logger.warn(`Missing email for auto invite on resume ${resume.id}.`);
            return;
        }
        this.logger.log(
            `Auto invite recipient resolved (resumeId=${resume.id}, email=${email}, source=${source}).`,
        );

        const invitation = await this.invitationService.createInvitationFromAuto(
            thresholds.agencyId,
            resume.id,
            email,
            name ?? undefined,
        );
        if (!invitation?.emailStatus) {
            this.logger.warn(`Auto invite email not sent for resume ${resume.id}.`);
            return;
        }

        await this.prisma.resume.update({
            where: { id: resume.id },
            data: { auto_invited: true },
        });

        // Schedule automatic AI voice call reminder (2 days after auto-invite) if phone is available
        const phone =
            structuredData?.contact?.phone ??
            structuredData?.contact?.Phone ??
            structuredData?.phone ??
            structuredData?.Phone ??
            null;

        if (!phone) {
            this.logger.log(
                `Skipping AI call scheduling for resume ${resume.id}: no phone number in structured data.`,
            );
            return;
        }

        try {
            const job = await this.prisma.job.findUnique({
                where: { id: resume.job_id },
                select: {
                    title: true,
                    agency: {
                        select: {
                            company_name: true,
                        },
                    },
                },
            });

            const jobTitle = job?.title ?? null;
            const companyName = job?.agency?.company_name ?? null;

            const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

            await this.aiCallProducer.scheduleInterviewReminderCall(
                {
                    resumeId: resume.id,
                    jobId: resume.job_id,
                    agencyId: thresholds.agencyId,
                    toPhoneNumber: phone,
                    candidateName: name ?? null,
                    jobTitle,
                    companyName,
                },
                TWO_DAYS_MS,
            );

            this.logger.log(
                `Scheduled AI voice call reminder for resume ${resume.id}, job ${resume.job_id}, phone ${phone}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to schedule AI voice call reminder for resume ${resume.id}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /** Process batch outputs: save structured data and AI analysis */
    private async processBatchOutput(batch: Batch, projectIndex: number) {
        const outputs = await this.downloadBatchOutput(batch, projectIndex);

        let fallbackJobId: number | null = null;
        let fallbackAgencyId: number | null = null;

        for (const line of outputs) {
            const customId = line.custom_id;
            const response = line.response?.body;

            if (!response) continue;

            // Map custom_id to Resume
            const resumeId = parseInt(customId.replace("resume-", "")); // adjust mapping logic
            const resume = await this.prisma.resume.findUnique({
                where: { id: resumeId },
                select: {
                    id: true,
                    job_id: true,
                    auto_invited: true,
                    auto_shortlisted: true,
                    auto_denied: true,
                },
            });
            if (!resume) continue;
            if (!fallbackJobId) {
                fallbackJobId = resume.job_id;
            }
            if (!fallbackAgencyId) {
                const thresholds = await this.getJobThresholds(resume.job_id);
                fallbackAgencyId = thresholds?.agencyId ?? null;
            }

            const messageContent = response?.choices?.[0]?.message?.content;
            if (!messageContent || typeof messageContent !== "string") {
                this.logger.warn(`Missing message content for resume ${resume.id}.`);
                continue;
            }

            let parsed: any;
            try {
                parsed = JSON.parse(messageContent);
            } catch (err) {
                this.logger.error(`Failed to parse AI JSON for resume ${resume.id}.`, err as any);
                continue;
            }

            const structuredData = parsed?.structured ?? null;
            const analysis = parsed?.analysis ?? null;

            if (!structuredData && !analysis) {
                this.logger.warn(`No structured or analysis data for resume ${resume.id}.`);
                continue;
            }

            // Save structured data
            if (structuredData) {
                await this.prisma.resumeStructured.upsert({
                    where: { resume_id: resume.id },
                    update: { data: structuredData },
                    create: { resume_id: resume.id, data: structuredData }
                });
            }

            // Save AI analysis
            if (analysis) {
                const scoreValue = typeof analysis.score === "number" ? Math.round(analysis.score) : 0;
                const mergedInsights = {
                    ...(analysis.insights ?? {}),
                    score_breakdown: analysis.score_breakdown ?? analysis.scoreBreakdown ?? null,
                    ai_insights: analysis.ai_insights ?? analysis.aiInsights ?? null,
                };
                await this.prisma.resumeAnalysis.upsert({
                    where: { resume_id: resume.id },
                    update: {
                        score: scoreValue,
                        seniority_level: analysis.seniorityLevel ?? analysis.seniority_level ?? "",
                        recommendation: analysis.recommendation ?? "",
                        insights: mergedInsights,
                    },
                    create: {
                        resume_id: resume.id,
                        job_id: resume.job_id,
                        score: scoreValue,
                        seniority_level: analysis.seniorityLevel ?? analysis.seniority_level ?? "",
                        recommendation: analysis.recommendation ?? "",
                        insights: mergedInsights,
                    }
                });

                await this.applyAutoActions(
                    resume,
                    scoreValue,
                    structuredData as StructuredData | null,
                );
            }
        }

        // Update batch in DB
        const batchRecord = await this.updateResumeAiBatch(batch, ResumeAiBatchStatus.completed);
        await this.createInboxForBatchStatus(
            batchRecord,
            ResumeAiBatchStatus.completed,
            batch.id,
            { agencyId: fallbackAgencyId, jobId: fallbackJobId },
        );
        this.logger.log(`Processed batch ${batch.id} with ${outputs.length} outputs`);
    }

    /** Pull unfinished batches from OpenAI */
    private async pullResumeBatchesFromOpenAi() {
        const batches = await this.getAllNotCompletedBatchesFromDb();
        if (batches.length === 0) return [];

        const results: Batch[] = [];

        for (const record of batches) {
            const batchId = record.batch_id;
            if (!batchId) continue;

            const aiMeta = (record.ai_meta ?? {}) as Record<string, unknown>;
            const projectIndex = typeof aiMeta.openai_project_index === "number" ? aiMeta.openai_project_index : 0;

            try {
                const openai = this.openaiService.getClient(projectIndex);
                const batch = await openai.batches.retrieve(batchId);

                if (batch.status === "completed") {
                    await this.processBatchOutput(batch, projectIndex);
                    results.push(batch);
                } else {
                    const mappedStatus = this.mapOpenAiStatus(batch.status);
                    if (mappedStatus) {
                        if (
                            mappedStatus === ResumeAiBatchStatus.failed ||
                            mappedStatus === ResumeAiBatchStatus.cancelled ||
                            mappedStatus === ResumeAiBatchStatus.expired
                        ) {
                            const retried = await this.retryFailedBatch(batch, projectIndex);
                            if (!retried) {
                                const batchRecord = await this.updateResumeAiBatch(batch, mappedStatus);
                                await this.createInboxForBatchStatus(batchRecord, mappedStatus, batch.id);
                            }
                        } else {
                            await this.updateResumeAiBatch(batch, mappedStatus);
                            // We don't send inbox for pending/validating every pull
                        }
                    }
                }
            } catch (err) {
                this.logger.error(`Failed to retrieve batch ${batchId} [Project ${projectIndex}]`, err as any);
            }
        }

        return results;
    }

    /** Worker entry point */
    async process(job: Job): Promise<any> {
        this.logger.log(`Processing job ${job.id}`);
        return this.pullResumeBatchesFromOpenAi();
    }
}
