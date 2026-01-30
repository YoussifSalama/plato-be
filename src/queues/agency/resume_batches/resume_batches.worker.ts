import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { ResumeAiBatchStatus } from "@generated/prisma";
import { Batch } from "openai/resources";
import * as path from 'path';
import * as fs from 'fs';
import { InvitationService } from "src/modules/agency/invitation/invitation.service";

const batchOutputFolder = path.join(process.cwd(), 'uploads', 'resumes_batches_output');

type JobThresholds = {
    agencyId: number;
    autoScoreMatchingThreshold: number | null;
    autoEmailInviteThreshold: number | null;
    autoShortlistedThreshold: number | null;
    autoDeniedThreshold: number | null;
};

type StructuredContact = {
    email?: string | null;
};

type StructuredData = {
    name?: string | null;
    contact?: StructuredContact | null;
};

@Processor("resume_batches_pull_queue")
@Injectable()
export class ResumeBatchesWorker extends WorkerHost {
    private readonly logger = new Logger(ResumeBatchesWorker.name);
    private readonly openai: OpenAI;
    private readonly jobThresholdCache = new Map<number, JobThresholds | null>();

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly invitationService: InvitationService,
    ) {
        super();
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>("env.openai.apiKey") ?? ""
        });
        this.logger.log("ResumeBatchesWorker initialized");
    }

    /** Get all batches not yet completed in DB */
    private async getAllNotCompletedBatchesFromDb() {
        return this.prisma.resumeProcessingBatch.findMany({
            where: { status: { notIn: [ResumeAiBatchStatus.completed] } }
        });
    }

    /** Download output file from OpenAI and parse JSONL */
    private async downloadBatchOutput(batch: Batch): Promise<any[]> {
        if (!batch.output_file_id) return [];

        try {
            const res = await this.openai.files.content(batch.output_file_id);
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
            this.logger.error(`Failed to download output for batch ${batch.id}`, err as any);
            return [];
        }
    }

    /** Update batch metadata in DB */
    private async updateResumeAiBatch(batch: Batch) {
        const batchMeta = JSON.parse(JSON.stringify(batch));
        await this.prisma.resumeProcessingBatch.update({
            where: { batch_id: batch.id },
            data: {
                output_file_id: batch.output_file_id,
                status: ResumeAiBatchStatus.completed,
                ai_meta: batchMeta,
            },
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
            return { name, email };
        }
        const structured = await this.prisma.resumeStructured.findUnique({
            where: { resume_id: resumeId },
            select: { data: true },
        });
        const data = structured?.data as StructuredData | null | undefined;
        return {
            name: name ?? data?.name ?? null,
            email: data?.contact?.email ?? null,
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

        const { email, name } = await this.resolveRecipientContact(resume.id, structuredData);
        if (!email) {
            this.logger.warn(`Missing email for auto invite on resume ${resume.id}.`);
            return;
        }

        await this.invitationService.createInvitationFromAuto(
            thresholds.agencyId,
            resume.id,
            email,
            name ?? undefined,
        );

        await this.prisma.resume.update({
            where: { id: resume.id },
            data: { auto_invited: true },
        });
    }

    /** Process batch outputs: save structured data and AI analysis */
    private async processBatchOutput(batch: Batch) {
        const outputs = await this.downloadBatchOutput(batch);

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
        await this.updateResumeAiBatch(batch);
        this.logger.log(`Processed batch ${batch.id} with ${outputs.length} outputs`);
    }

    /** Pull unfinished batches from OpenAI */
    private async pullResumeBatchesFromOpenAi() {
        const batches = await this.getAllNotCompletedBatchesFromDb();
        const batchIds = batches
            .map(batch => batch.batch_id)
            .filter((batchId): batchId is string => Boolean(batchId));

        let relevantBatches: Batch[] = [];
        let after: string | undefined = undefined;

        while (relevantBatches.length < batchIds.length) {
            const response = await this.openai.batches.list({ limit: 100, after });
            const matching = response.data.filter(batch => batchIds.includes(batch.id));
            relevantBatches.push(...matching);

            if (!response.has_more) break;
            after = response.data[response.data.length - 1].id;
        }

        const completedBatches = relevantBatches.filter(batch => batch.status === "completed");

        // Process each completed batch
        for (const batch of completedBatches) {
            await this.processBatchOutput(batch);
        }

        return completedBatches;
    }

    /** Worker entry point */
    async process(job: Job): Promise<any> {
        this.logger.log(`Processing job ${job.id}`);
        return this.pullResumeBatchesFromOpenAi();
    }
}
