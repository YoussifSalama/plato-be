import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { Prisma } from "@generated/prisma";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { PaginationHelper } from "src/shared/helpers/features/pagination";
import responseFormatter from "src/shared/helpers/response";
import { buildJobAiPrompt } from "src/shared/ai/agency/prompts/job.prompt";
import { CreateJobDto } from "./dto/create-job.dto";
import { CreateJobAiPromptDto } from "./dto/create-job-ai-prompt.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { GetJobsDto } from "./dto/get-jobs.dto";
import { SearchJobsDto } from "./dto/search-jobs.dto";
import { GetJobResumesDto } from "./dto/get-job-resumes.dto";
import { GenerateJobAiDto } from "./dto/generate-job-ai.dto";

@Injectable()
export class JobService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationHelper: PaginationHelper,
        private readonly configService: ConfigService
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>("env.openai.apiKey") ?? "",
        });
    }

    private readonly openai: OpenAI;

    private validateSalaryRange(salaryFrom?: number, salaryTo?: number) {
        if (salaryFrom != null && salaryTo != null && salaryFrom > salaryTo) {
            throw new BadRequestException("salary_from must be less than or equal to salary_to.");
        }
    }

    private ensureUpdateFields(dto: UpdateJobDto) {
        if (!Object.keys(dto).length) {
            throw new BadRequestException("No fields to update.");
        }
    }

    private async getAgencyId(accountId: number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { agency_id: true },
        });
        if (!account?.agency_id) {
            throw new BadRequestException("Agency not found.");
        }
        return account.agency_id;
    }

    async createJob(accountId: number, dto: CreateJobDto) {
        this.validateSalaryRange(dto.salary_from, dto.salary_to);
        const agencyId = await this.getAgencyId(accountId);
        const jobClient = (this.prisma as unknown as {
            job: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> }
        }).job;
        return jobClient.create({
            data: {
                ...dto,
                agency_id: agencyId,
                soft_skills: dto.soft_skills ?? [],
                technical_skills: dto.technical_skills ?? [],
                languages: dto.languages ?? [],
                certifications: dto.certifications ?? "",
            },
        });
    }

    async updateJob(accountId: number, jobId: number, dto: UpdateJobDto) {
        this.ensureUpdateFields(dto);
        this.validateSalaryRange(dto.salary_from, dto.salary_to);
        const agencyId = await this.getAgencyId(accountId);
        const jobClient = (this.prisma as unknown as {
            job: {
                findFirst: (args: { where: { id: number; agency_id: number }; select: { id: true } }) => Promise<{ id: number } | null>
                update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown>
            }
        }).job;
        const job = await jobClient.findFirst({
            where: { id: jobId, agency_id: agencyId },
            select: { id: true },
        });
        if (!job) {
            throw new BadRequestException("Job not found.");
        }
        return jobClient.update({
            where: { id: jobId },
            data: {
                ...dto,
                ...(dto.soft_skills ? { soft_skills: dto.soft_skills } : {}),
                ...(dto.technical_skills ? { technical_skills: dto.technical_skills } : {}),
                ...(dto.languages ? { languages: dto.languages } : {}),
            }
        });
    }

    async getJobById(accountId: number, jobId: number) {
        const agencyId = await this.getAgencyId(accountId);
        const job = await (this.prisma as unknown as {
            job: {
                findFirst: (args: Record<string, unknown>) => Promise<unknown | null>;
            };
        }).job.findFirst({
            where: { id: jobId, agency_id: agencyId },
            include: {
                jobAiPrompt: true,
            },
        });
        if (!job) {
            throw new BadRequestException("Job not found.");
        }
        return job;
    }

    async getJobResumes(accountId: number, jobId: number, dto: GetJobResumesDto) {
        const agencyId = await this.getAgencyId(accountId);
        const job = await (this.prisma as unknown as {
            job: {
                findFirst: (args: { where: { id: number; agency_id: number }; select: { id: true } }) => Promise<{ id: number } | null>;
            };
        }).job.findFirst({
            where: { id: jobId, agency_id: agencyId },
            select: { id: true },
        });
        if (!job) {
            throw new BadRequestException("Job not found.");
        }

        const partialMatching = dto.partial_matching?.trim();
        const filters: Prisma.ResumeWhereInput[] = [
            { job_id: jobId },
        ];

        if (partialMatching) {
            filters.push({
                OR: [
                    {
                        name: {
                            contains: partialMatching,
                            mode: "insensitive",
                        },
                    },
                    {
                        resume_structured: {
                            is: {
                                data: {
                                    path: ["name"],
                                    string_contains: partialMatching,
                                },
                            },
                        },
                    },
                    {
                        resume_structured: {
                            is: {
                                data: {
                                    path: ["contact", "email"],
                                    string_contains: partialMatching,
                                },
                            },
                        },
                    },
                ],
            });
        }

        if (typeof dto.score === "number" && !Number.isNaN(dto.score)) {
            filters.push({
                resume_analysis: {
                    is: {
                        score: {
                            gte: dto.score,
                        },
                    },
                },
            });
        }

        if (dto.recommendation) {
            filters.push({
                resume_analysis: {
                    is: {
                        recommendation: dto.recommendation,
                    },
                },
            });
        }

        if (typeof dto.auto_invited === "boolean") {
            filters.push({ auto_invited: dto.auto_invited });
        }

        if (typeof dto.auto_shortlisted === "boolean") {
            filters.push({ auto_shortlisted: dto.auto_shortlisted });
        }

        if (typeof dto.auto_denied === "boolean") {
            filters.push({ auto_denied: dto.auto_denied });
        }

        const filterObject: Prisma.ResumeWhereInput =
            filters.length > 0 ? { AND: filters } : {};

        const sortOrder: Prisma.SortOrder =
            dto.sort_order === "asc"
                ? Prisma.SortOrder.asc
                : Prisma.SortOrder.desc;
        const sortingObject = dto.sort_by
            ? { [dto.sort_by]: sortOrder }
            : { created_at: Prisma.SortOrder.desc };

        const pagination = await this.paginationHelper.applyPagination(dto);
        const resumes = await this.prisma.resume.findMany({
            where: filterObject,
            orderBy: sortingObject,
            select: {
                id: true,
                name: true,
                link: true,
                created_at: true,
                auto_invited: true,
                auto_shortlisted: true,
                auto_denied: true,
                resume_structured: {
                    select: {
                        data: true,
                    },
                },
                resume_analysis: {
                    select: {
                        score: true,
                        recommendation: true,
                    },
                },
            },
            ...pagination,
        });

        const resumesWithStructured = resumes.map((resume) => {
            const { resume_structured, ...rest } = resume;
            const data = resume_structured?.data as { name?: string | null; contact?: { email?: string | null } } | undefined;
            return {
                ...rest,
                structured_name: data?.name ?? null,
                structured_email: data?.contact?.email ?? null,
            };
        });

        const paginationMeta = await this.paginationHelper.generatePaginationMeta(
            dto,
            Prisma.ModelName.Resume,
            filterObject,
        );

        return responseFormatter(
            resumesWithStructured,
            paginationMeta,
            "Job resumes fetched successfully",
            200
        );
    }

    async setJobActiveStatus(accountId: number, jobId: number, isActive: boolean) {
        const agencyId = await this.getAgencyId(accountId);
        const jobClient = (this.prisma as unknown as {
            job: {
                findFirst: (args: { where: { id: number; agency_id: number }; select: { id: true } }) => Promise<{ id: number } | null>
                update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown>
            }
        }).job;
        const job = await jobClient.findFirst({
            where: { id: jobId, agency_id: agencyId },
            select: { id: true },
        });
        if (!job) {
            throw new BadRequestException("Job not found.");
        }
        return jobClient.update({
            where: { id: jobId },
            data: { is_active: isActive },
        });
    }

    async upsertJobAiPrompt(accountId: number, jobId: number, dto: CreateJobAiPromptDto) {
        const agencyId = await this.getAgencyId(accountId);
        const job = await (this.prisma as unknown as {
            job: {
                findFirst: (args: Record<string, unknown>) => Promise<{ id: number; job_ai_prompt_id: number | null } | null>;
                update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown>;
            };
        }).job.findFirst({
            where: { id: jobId, agency_id: agencyId },
            select: { id: true, job_ai_prompt_id: true },
        });
        if (!job) {
            throw new BadRequestException("Job not found.");
        }
        if (job.job_ai_prompt_id) {
            return this.prisma.jobAiPrompt.update({
                where: { id: job.job_ai_prompt_id },
                data: {
                    target: dto.target,
                    prompt: dto.prompt,
                    evaluation: dto.evaluation as unknown as Prisma.InputJsonValue,
                },
            });
        }
        const prompt = await this.prisma.jobAiPrompt.create({
            data: {
                target: dto.target,
                prompt: dto.prompt,
                evaluation: dto.evaluation as unknown as Prisma.InputJsonValue,
            },
        });
        await (this.prisma as unknown as {
            job: {
                update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown>;
            };
        }).job.update({
            where: { id: jobId },
            data: { job_ai_prompt_id: prompt.id },
        });
        return prompt;
    }

    async generateJobContent(accountId: number, dto: GenerateJobAiDto) {
        await this.getAgencyId(accountId);
        if (!this.configService.get<string>("env.openai.apiKey")) {
            throw new BadRequestException("OpenAI API key not configured.");
        }
        const missingFields = [
            dto.title ? null : "title",
            dto.employment_type ? null : "employment_type",
            dto.workplace_type ? null : "workplace_type",
            dto.industry ? null : "industry",
            dto.seniority_level ? null : "seniority_level",
            dto.location ? null : "location",
        ].filter(Boolean) as string[];
        if (missingFields.length > 0) {
            throw new BadRequestException(
                `Missing required fields: ${missingFields.join(", ")}`
            );
        }
        const prompt = buildJobAiPrompt(dto);
        const completion = await this.openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
                { role: "system", content: prompt },
                {
                    role: "user",
                    content: "Generate the content now using the provided context.",
                },
            ],
            max_completion_tokens: 900,
        });
        const content = completion.choices?.[0]?.message?.content ?? "";
        let parsed: { description?: string; requirements?: string } | null = null;
        try {
            parsed = JSON.parse(content);
        } catch {
            throw new BadRequestException("AI response parsing failed.");
        }
        return responseFormatter(
            {
                description: parsed?.description ?? "",
                requirements: parsed?.requirements ?? "",
            },
            undefined,
            "Job content generated.",
            200
        );
    }

    async getJobs(accountId: number, getJobsDto: GetJobsDto) {
        const agencyId = await this.getAgencyId(accountId);
        const partialMatching = getJobsDto.partial_matching?.trim();
        const filters: Prisma.JobWhereInput[] = [
            { agency_id: agencyId },
        ];

        if (partialMatching) {
            filters.push({
                OR: [
                    {
                        title: {
                            contains: partialMatching,
                            mode: "insensitive",
                        },
                    },
                    {
                        location: {
                            contains: partialMatching,
                            mode: "insensitive",
                        },
                    },
                ],
            });
        }

        if (typeof getJobsDto.is_active === "boolean") {
            filters.push({ is_active: getJobsDto.is_active });
        }

        const filterObject: Prisma.JobWhereInput =
            filters.length > 0 ? { AND: filters } : {};

        const sortOrder: Prisma.SortOrder =
            getJobsDto.sort_order === "asc"
                ? Prisma.SortOrder.asc
                : Prisma.SortOrder.desc;
        const sortingObject = getJobsDto.sort_by
            ? { [getJobsDto.sort_by]: sortOrder }
            : { created_at: Prisma.SortOrder.desc };

        const pagination = await this.paginationHelper.applyPagination(getJobsDto);
        const jobs = await (this.prisma as unknown as {
            job: {
                findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
            };
        }).job.findMany({
            where: filterObject,
            orderBy: sortingObject,
            select: {
                id: true,
                title: true,
                employment_type: true,
                workplace_type: true,
                seniority_level: true,
                industry: true,
                location: true,
                is_active: true,
                created_at: true,
            },
            ...pagination,
        });

        const paginationMeta = await this.paginationHelper.generatePaginationMeta(
            getJobsDto,
            Prisma.ModelName.Job,
            filterObject,
        );
        return responseFormatter(jobs, paginationMeta, "Jobs fetched successfully", 200);
    }

    async searchActiveJobs(accountId: number, dto: SearchJobsDto) {
        const agencyId = await this.getAgencyId(accountId);
        const partialMatching = dto.partial_matching?.trim();
        const filters: Prisma.JobWhereInput[] = [
            { agency_id: agencyId },
            { is_active: true },
        ];

        if (partialMatching) {
            filters.push({
                OR: [
                    {
                        title: {
                            contains: partialMatching,
                            mode: "insensitive",
                        },
                    },
                    {
                        location: {
                            contains: partialMatching,
                            mode: "insensitive",
                        },
                    },
                ],
            });
        }

        const results = await (this.prisma as unknown as {
            job: {
                findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
            };
        }).job.findMany({
            where: { AND: filters },
            orderBy: { created_at: Prisma.SortOrder.desc },
            take: dto.limit ?? 10,
            select: {
                id: true,
                title: true,
                created_at: true,
            },
        });

        return responseFormatter(results, null, "Jobs fetched successfully", 200);
    }

}
