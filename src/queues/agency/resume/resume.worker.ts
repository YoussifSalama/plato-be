import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { ResumeParserService } from "src/shared/helpers/modules/agency/resume/resume.helper";
import { ArrangedSavedResume } from "./resume.producer";
import * as path from 'path';
import * as fs from 'fs';
import { buildResumeAiPromptV1 } from "src/shared/ai/agency/prompts/resume.prompt";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { ResumeAiBatchStatus } from "@generated/prisma";

const resumesFolder = path.join(process.cwd(), 'uploads', 'resumes');
const batchJsonlFolder = path.join(process.cwd(), 'uploads', 'resumes_batches_jsonl');
if (!fs.existsSync(batchJsonlFolder)) {
    fs.mkdirSync(batchJsonlFolder, { recursive: true });
}

@Processor('resume_queue')
export class ResumeWorker extends WorkerHost {
    private readonly openai: OpenAI;
    private readonly logger = new Logger(ResumeWorker.name);
    constructor(private readonly prisma: PrismaService, private readonly resumeParserService: ResumeParserService, private readonly configService: ConfigService) {
        super();
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>("env.openai.apiKey") ?? "",
        })
    }

    private async updateResumeAiBatch(batch: OpenAI.Batch) {
        const { completion_window, metadata, input_file_id, id: batchId } = batch;
        const customerId = metadata?.customer_id ?? null;
        await this.prisma.resumeProcessingBatch.update({
            where: {
                input_file_id: input_file_id
            },
            data: {
                status: ResumeAiBatchStatus.pending,
                ai_meta: {
                    completion_window: completion_window,
                    customer_id: customerId,
                },
                batch_id: batchId,
            },
        })
    }
    private async sendBatchCreatedToOpenAi(batchJsonlFileName: string) {
        const file = await this.openai.files.create({
            file: fs.createReadStream(batchJsonlFileName),
            purpose: "batch",
        });
        this.logger.log(`Uploaded batch file to OpenAI: ${file.id}`);
        await this.prisma.resumeProcessingBatch.create({
            data: {
                input_file_link: batchJsonlFileName,
                input_file_id: file.id,
                status: 'pending'
            },
        });
        const batch = await this.openai.batches.create({
            input_file_id: file.id,
            endpoint: "/v1/chat/completions",
            completion_window: "24h",
        });
        await this.updateResumeAiBatch(batch);
        return batch;
    }

    private async makeResumesBatchJsonl(parsedResumes: { id: number, parsed: string }[], jobContext: Record<string, unknown>) {
        const prompt = buildResumeAiPromptV1(jobContext);
        const lines = parsedResumes.map(resume => {
            return JSON.stringify({
                custom_id: `resume-${resume.id}`,
                method: "POST",
                url: "/v1/chat/completions",
                body: {
                    model: "gpt-5.2",
                    messages: [
                        {
                            role: "system",
                            content: prompt
                        },
                        {
                            role: "user",
                            content: `Resume:\n${resume.parsed}`
                        }
                    ],
                    max_completion_tokens: 2000
                }
            });
        });
        const fileName = path.join(batchJsonlFolder, `batch_${Date.now()}.jsonl`);
        fs.writeFileSync(fileName, lines.join("\n"));
        return fileName;
    }

    private async parseResumes(arrangedSavedResumes: ArrangedSavedResume[]) {
        let parsedResumes: { id: number, parsed: string }[] = [];
        for (const arrangedSavedResume of arrangedSavedResumes) {
            const parsed = await this.resumeParserService.parse(path.join(resumesFolder, arrangedSavedResume.link));
            parsedResumes.push({ id: arrangedSavedResume.id, parsed });
        }
        return parsedResumes;
    }

    async process(job: Job<{ arrangedSavedResumes: ArrangedSavedResume[]; jobId: number }>) {
        try {
            this.logger.log(`Processing job ${job.id} with ${job.data.arrangedSavedResumes.length} resume(s).`);
            const arrangedSavedResumes = job.data.arrangedSavedResumes;
            const jobClient = (this.prisma as unknown as {
                job: {
                    findUnique: (args: {
                        where: { id: number }
                        include?: { jobAiPrompt?: boolean };
                    }) => Promise<Record<string, unknown> | null>
                }
            }).job;
            const jobRecord = await jobClient.findUnique({
                where: { id: job.data.jobId },
                include: {
                    jobAiPrompt: true,
                },
            });
            if (!jobRecord) {
                throw new Error("Job not found for resume processing.");
            }
            const {
                auto_score_matching_threshold,
                auto_email_invite_threshold,
                auto_shortlisted_threshold,
                auto_denied_threshold,
                ...jobContext
            } = jobRecord;
            const parsedResumes = await this.parseResumes(arrangedSavedResumes);
            this.logger.log(`Parsed ${parsedResumes.length} resume(s).`);
            const chunkSize = 20;
            for (let i = 0; i < parsedResumes.length; i += chunkSize) {
                const chunk = parsedResumes.slice(i, i + chunkSize);
                await Promise.all(
                    chunk.map((resume) =>
                        this.prisma.resume.update({
                            where: { id: resume.id },
                            data: { parsed: resume.parsed },
                        }),
                    ),
                );
                const batchJsonlFileName = await this.makeResumesBatchJsonl(chunk, jobContext);
                this.logger.log(`Created batch JSONL file: ${batchJsonlFileName}`);
                await this.sendBatchCreatedToOpenAi(batchJsonlFileName);
            }
            this.logger.log(`Updated parsed text for ${parsedResumes.length} resume(s).`);
        } catch (error) {
            this.logger.error(`Job ${job.id} failed.`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
}