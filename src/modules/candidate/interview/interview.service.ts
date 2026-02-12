import { Agency, Job, ResumeAnalysis, ResumeStructured, InvitationTokenStatus, Prisma } from '@generated/prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import GenerateReferenceQuestions from 'src/shared/ai/candidate/prompts/ai.refrence.prompt';
import { InterviewLanguage } from './dto/create-interview-resources.dto';
import responseFormatter from 'src/shared/helpers/response';

@Injectable()
export class InterviewService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>("env.openai.apiKey") ?? "",
        });
    }

    private readonly openai: OpenAI;

    private toJsonSnapshot<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }

    private async generateInterviewPreparedQuestions(
        job: Job,
        resumeStructured: ResumeStructured,
        resumeAnalysis: ResumeAnalysis,
        agency: Agency,
        language: InterviewLanguage = InterviewLanguage.ar
    ) {
        const basePrompt = GenerateReferenceQuestions({
            job,
            resumeStructured,
            resumeAnalysis,
            agency,
            language,
        });
        const strictPrompt = `${basePrompt}\n\nSTRICT: Output only ${language} questions. Do not use any other language.`;

        const questions = await this.requestQuestions(basePrompt);
        if (this.matchesLanguage(questions, language) && questions.length > 0) {
            return questions;
        }

        const retryQuestions = await this.requestQuestions(strictPrompt);
        if (!this.matchesLanguage(retryQuestions, language) || retryQuestions.length === 0) {
            throw new BadRequestException("AI response language mismatch.");
        }
        return retryQuestions;
    }

    private extractJson(content: string): string | null {
        const trimmed = content.trim();
        if (!trimmed) {
            return null;
        }
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            return trimmed;
        }
        const arrayStart = trimmed.indexOf("[");
        const arrayEnd = trimmed.lastIndexOf("]");
        if (arrayStart !== -1 && arrayEnd > arrayStart) {
            return trimmed.slice(arrayStart, arrayEnd + 1);
        }
        const objectStart = trimmed.indexOf("{");
        const objectEnd = trimmed.lastIndexOf("}");
        if (objectStart !== -1 && objectEnd > objectStart) {
            return trimmed.slice(objectStart, objectEnd + 1);
        }
        return null;
    }

    private normalizeQuestions(questions: string[]): string[] {
        return questions
            .filter((question): question is string => typeof question === "string")
            .map(question => question.trim())
            .filter(Boolean);
    }

    private matchesLanguage(questions: string[], language: InterviewLanguage): boolean {
        if (questions.length === 0) return false;
        const arabicCount = questions.filter(question => /[\u0600-\u06FF]/.test(question)).length;
        const latinCount = questions.filter(question => /[A-Za-z]/.test(question)).length;
        if (language === InterviewLanguage.ar) {
            return arabicCount / questions.length >= 0.6 && latinCount / questions.length <= 0.2;
        }
        return latinCount / questions.length >= 0.6 && arabicCount / questions.length <= 0.2;
    }

    private async requestQuestions(prompt: string): Promise<string[]> {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [{ role: "system", content: prompt }],
        });
        const content = completion.choices?.[0]?.message?.content ?? "";
        const jsonText = this.extractJson(content);
        if (!jsonText) {
            return [];
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonText);
        } catch {
            return [];
        }
        let questions: string[] = [];
        if (Array.isArray(parsed)) {
            questions = parsed
                .map(item => (item && typeof item === "object" && "question" in item ? (item as { question?: string }).question : undefined))
                .filter((question): question is string => typeof question === "string");
        } else if (parsed && typeof parsed === "object" && "questions" in parsed) {
            const items = (parsed as { questions?: unknown }).questions;
            if (Array.isArray(items)) {
                questions = items.filter((question): question is string => typeof question === "string");
            }
        }
        return this.normalizeQuestions(questions);
    }

    async createInterviewResources(invitationToken: string, language: "ar" | "en") {
        const token = await this.prisma.invitationToken.findFirst({
            where: {
                token: invitationToken,
                revoked: false,
                expires_at: { gt: new Date() },
            },
            include: {
                invitation: {
                    include: {
                        from: true,
                        job: true,
                        to: true,
                    }
                },
            }
        })

        if (!token) {
            throw new BadRequestException("Invalid invitation token.");
        }

        const selectedLanguage = language === "en" ? InterviewLanguage.en : InterviewLanguage.ar;
        const existingResources = await this.prisma.interviewResources.findFirst({
            where: { invitation_token_id: token.id },
        });

        if (existingResources && existingResources.language === selectedLanguage) {
            const existingQuestions = Array.isArray(existingResources.prepared_questions)
                ? existingResources.prepared_questions
                : [];
            if (this.matchesLanguage(existingQuestions, selectedLanguage)) {
                await this.prisma.invitationToken.update({
                    where: { id: token.id },
                    data: { status: InvitationTokenStatus.in_use },
                });
                return existingResources;
            }
        }

        const { from: agency, job, to: resume } = token.invitation;
        const [resumeStructured, resumeAnalysis] = await Promise.all([
            this.prisma.resumeStructured.findUnique({
                where: { resume_id: resume.id },
            }),
            this.prisma.resumeAnalysis.findUnique({
                where: { resume_id: resume.id },
            }),
        ]);

        if (!resumeStructured) {
            throw new BadRequestException("Resume not structured.");
        }

        if (!resumeAnalysis) {
            throw new BadRequestException("Resume analysis not found.");
        }

        let preparedQuestions: string[] = [];
        try {
            preparedQuestions = await this.generateInterviewPreparedQuestions(
                job,
                resumeStructured,
                resumeAnalysis,
                agency,
                selectedLanguage
            );
        } catch {
            preparedQuestions = [];
        }
        preparedQuestions = preparedQuestions
            .filter((question): question is string => typeof question === "string")
            .map(question => question.trim())
            .filter(Boolean);
        const agencySnapshot = this.toJsonSnapshot(agency);
        const jobSnapshot = this.toJsonSnapshot(job);
        const resumeSnapshot = this.toJsonSnapshot({
            resume,
            structured: resumeStructured,
            analysis: resumeAnalysis,
        });

        if (existingResources) {
            const [updatedResources] = await this.prisma.$transaction([
                this.prisma.interviewResources.update({
                    where: { id: existingResources.id },
                    data: {
                        language: selectedLanguage,
                        agency_snapshot: agencySnapshot,
                        job_snapshot: jobSnapshot,
                        resume_snapshot: resumeSnapshot,
                        prepared_questions: preparedQuestions,
                    },
                }),
                this.prisma.invitationToken.update({
                    where: { id: token.id },
                    data: { status: InvitationTokenStatus.in_use },
                }),
            ]);
            return updatedResources;
        }

        const [createdResources] = await this.prisma.$transaction([
            this.prisma.interviewResources.create({
                data: {
                    agency_id: agency.id,
                    job_id: job.id,
                    resume_id: resume.id,
                    invitation_token_id: token.id,
                    language: selectedLanguage,
                    agency_snapshot: agencySnapshot,
                    job_snapshot: jobSnapshot,
                    resume_snapshot: resumeSnapshot,
                    prepared_questions: preparedQuestions,
                },
            }),
            this.prisma.invitationToken.update({
                where: { id: token.id },
                data: { status: InvitationTokenStatus.in_use },
            }),
        ]);
        return createdResources;
    }

    async listCandidateInterviews(
        candidateId: number,
        options: {
            page?: number;
            limit?: number;
            sortBy?: "created_at" | "expires_at";
            sortOrder?: "asc" | "desc";
            status?: "active" | "expired" | "revoked" | "all";
            search?: string;
        }
    ) {
        const page = Math.max(1, Number(options.page ?? 1));
        const limit = Math.min(50, Math.max(1, Number(options.limit ?? 10)));
        const sortBy = options.sortBy === "created_at" ? "created_at" : "expires_at";
        const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";
        const status = options.status ?? "active";
        const search = options.search?.trim();
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            select: { email: true },
        });
        const candidateEmail = candidate?.email ?? null;

        const now = new Date();
        const ownershipWhere: Prisma.InvitationTokenWhereInput = candidateEmail
            ? {
                OR: [
                    { candidate_id: candidateId },
                    {
                        invitation: {
                            to: {
                                resume_structured: {
                                    data: { path: ["email"], equals: candidateEmail },
                                },
                            },
                        },
                    },
                    {
                        invitation: {
                            to: {
                                resume_structured: {
                                    data: { path: ["Email"], equals: candidateEmail },
                                },
                            },
                        },
                    },
                    {
                        invitation: {
                            to: {
                                resume_structured: {
                                    data: { path: ["contact", "email"], equals: candidateEmail },
                                },
                            },
                        },
                    },
                    {
                        invitation: {
                            to: {
                                resume_structured: {
                                    data: { path: ["contact", "Email"], equals: candidateEmail },
                                },
                            },
                        },
                    },
                ],
            }
            : { candidate_id: candidateId };

        const statusWhere: Prisma.InvitationTokenWhereInput =
            status === "active"
                ? { revoked: false, expires_at: { gt: now } }
                : status === "revoked"
                    ? { revoked: true }
                    : status === "expired"
                        ? { OR: [{ revoked: true }, { expires_at: { lte: now } }] }
                        : {};

        const searchWhere: Prisma.InvitationTokenWhereInput = search
            ? {
                OR: [
                    {
                        invitation: {
                            job: {
                                title: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        invitation: {
                            job: {
                                description: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        invitation: {
                            from: {
                                company_name: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                ],
            }
            : {};

        const where: Prisma.InvitationTokenWhereInput = {
            AND: [ownershipWhere, statusWhere, searchWhere],
        };

        const [total, tokens] = await this.prisma.$transaction([
            this.prisma.invitationToken.count({ where }),
            this.prisma.invitationToken.findMany({
                where,
                include: {
                    invitation: {
                        include: {
                            from: {
                                select: {
                                    company_name: true,
                                    organization_url: true,
                                    company_size: true,
                                    company_industry: true,
                                },
                            },
                            job: {
                                select: {
                                    title: true,
                                    description: true,
                                    is_active: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        const items = tokens.map((token) => ({
            id: token.id,
            token: token.token,
            revoked: token.revoked,
            status: token.status,
            expires_at: token.expires_at,
            created_at: token.created_at,
            agency: token.invitation?.from ?? null,
            job: token.invitation?.job
                ? {
                    title: token.invitation.job.title,
                    description: token.invitation.job.description,
                    status: token.invitation.job.is_active ? "active" : "inactive",
                }
                : null,
        }));

        return responseFormatter(
            items,
            {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            "Candidate interviews retrieved.",
            200
        );
    }
}
