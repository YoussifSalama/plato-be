import { Agency, Job, ResumeAnalysis, ResumeStructured, InvitationTokenStatus, Prisma, InterviewSessionStatus } from '@generated/prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SpeechService } from 'src/modules/speech/speech.service';
import AiInterviewPrompt from 'src/shared/ai/candidate/prompts/ai.interview.prompt';
import GenerateReferenceQuestions from 'src/shared/ai/candidate/prompts/ai.refrence.prompt';
import { InterviewLanguage } from './dto/create-interview-resources.dto';
import responseFormatter from 'src/shared/helpers/response';
import {
    combineAnswerGroupChunks,
    getAnswerGroupDirectory,
    getLatestAnswerGroupIndex,
    getSessionChunksDirectory,
    writeAudioChunkToFile,
} from 'src/shared/helpers/modules/candidate/interview.helper';
import { AiPreparedQuestion, AiPreviousQuestions } from 'src/shared/types/ai/ai.types';
import * as fs from 'fs';
import * as path from 'path';
import { GetInterviewSessionsDto } from './dto/get-interview-sessions.dto';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';

@Injectable()
export class InterviewService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly speechService: SpeechService,
        private readonly paginationHelper: PaginationHelper
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>("env.openai.apiKey") ?? "",
        });
    }

    private readonly openai: OpenAI;

    private toJsonSnapshot<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }

    private async withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
        let timeoutId: NodeJS.Timeout | null = null;
        try {
            const timeoutPromise = new Promise<T>((resolve) => {
                timeoutId = setTimeout(() => resolve(fallback), ms);
            });
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    private getFallbackQuestion(language: "ar" | "en") {
        if (language === "en") {
            return "Welcome. Let's begin the interview. Please tell me about yourself.";
        }
        return "مرحبا. لنبدأ المقابلة. من فضلك حدثني عن نفسك.";
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

    private isSalaryQuestion(question: string) {
        const normalized = question.toLowerCase();
        return (
            /salary|compensation|expected\s+salary|salary\s+expectations/.test(normalized) ||
            /الراتب|المرتب|توقعات\s*الراتب|مرتبك\s*المتوقع/.test(question)
        );
    }

    private buildClosingMessage(language: "ar" | "en") {
        if (language === "en") {
            return "Thanks for your time. That’s all the questions I have for now. We’ll get back to you soon.";
        }
        return "شكرًا على وقتك. كده خلّصنا أسئلة المقابلة. هنرجعلك قريب جدًا.";
    }

    private normalizeQaLog(raw: unknown): AiPreviousQuestions[] {
        if (!Array.isArray(raw)) {
            return [];
        }
        return raw
            .map((entry) => {
                const question =
                    entry && typeof entry === "object" && "question" in entry
                        ? String((entry as { question?: unknown }).question ?? "")
                        : "";
                const answer =
                    entry && typeof entry === "object" && "answer" in entry
                        ? String((entry as { answer?: unknown }).answer ?? "")
                        : "";
                return { question, answer };
            })
            .filter((entry) => entry.question || entry.answer);
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
            model: "gpt-4o",
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

    private async generateNextInterviewQuestion(
        invitationTokenId: number,
        qaLog: AiPreviousQuestions[]
    ) {
        const interviewResources = await this.prisma.interviewResources.findFirst({
            where: { invitation_token_id: invitationTokenId },
            select: {
                language: true,
                prepared_questions: true,
                agency_id: true,
                job_id: true,
                resume_id: true,
            },
        });
        if (!interviewResources) {
            throw new BadRequestException("Interview resources not found.");
        }

        const [agency, job, resumeStructured, resumeAnalysis] = await Promise.all([
            this.prisma.agency.findUnique({
                where: { id: interviewResources.agency_id },
            }),
            this.prisma.job.findUnique({
                where: { id: interviewResources.job_id },
                include: { jobAiPrompt: true },
            }),
            this.prisma.resumeStructured.findUnique({
                where: { resume_id: interviewResources.resume_id },
            }),
            this.prisma.resumeAnalysis.findUnique({
                where: { resume_id: interviewResources.resume_id },
            }),
        ]);

        if (!agency || !job || !resumeStructured || !resumeAnalysis) {
            throw new BadRequestException("Interview resources are incomplete.");
        }

        const preparedQuestions: AiPreparedQuestion[] = Array.isArray(interviewResources.prepared_questions)
            ? interviewResources.prepared_questions
                .filter((question): question is string => typeof question === "string")
                .map((question) => ({ question }))
            : [];

        const selectedLanguage =
            interviewResources.language === "en" ? "en" : "ar";
        const prompt = AiInterviewPrompt({
            job,
            resumeStructerd: resumeStructured,
            resumeAnalysis,
            agency,
            previousQuestions: qaLog,
            preparedQuestions,
            language: selectedLanguage,
        });

        const completion = await this.withTimeout(
            this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: prompt }],
            }),
            5000,
            null
        );
        if (!completion) {
            return this.getFallbackQuestion(selectedLanguage);
        }
        const question = completion.choices?.[0]?.message?.content?.trim() ?? "";
        if (!question) {
            return this.getFallbackQuestion(selectedLanguage);
        }
        return question;
    }

    async startInterviewWithWelcome(interviewTokenId: number, includeSpeech = true) {
        await this.IntiateSessionAndCreateChunk(interviewTokenId);
        const [session, interviewResources] = await Promise.all([
            this.prisma.interviewSession.findFirst({
                where: { invitation_token_id: interviewTokenId },
            }),
            this.prisma.interviewResources.findFirst({
                where: { invitation_token_id: interviewTokenId },
                select: { language: true },
            }),
        ]);
        if (!session) {
            throw new BadRequestException("Interview session not found.");
        }
        if (!interviewResources) {
            throw new BadRequestException("Interview resources not found.");
        }
        const selectedLanguage = interviewResources.language === "en" ? "en" : "ar";

        const welcomeQuestion = await this.generateNextInterviewQuestion(
            interviewTokenId,
            []
        );
        const qaLog: AiPreviousQuestions[] = [
            { question: welcomeQuestion, answer: "" },
        ];
        await this.prisma.interviewSession.update({
            where: { id: session.id },
            data: { qa_log: qaLog as unknown as Prisma.InputJsonValue },
        });

        const speech = includeSpeech
            ? await this.withTimeout(
                this.speechService.synthesizeSpeech(
                    welcomeQuestion,
                    "ash",
                    "wav",
                    selectedLanguage
                ),
                5000,
                null
            )
            : null;

        return {
            interview_session_id: session.id,
            question: welcomeQuestion,
            audioBuffer: speech?.audioBuffer,
            contentType: speech?.contentType,
            language: selectedLanguage,
        };
    }

    async startInterviewSession(interviewTokenId: number) {
        await this.IntiateSessionAndCreateChunk(interviewTokenId);
        const [session, interviewResources] = await Promise.all([
            this.prisma.interviewSession.findFirst({
                where: { invitation_token_id: interviewTokenId },
                select: { id: true },
            }),
            this.prisma.interviewResources.findFirst({
                where: { invitation_token_id: interviewTokenId },
                select: { language: true },
            }),
        ]);
        if (!session) {
            throw new BadRequestException("Interview session not found.");
        }
        const selectedLanguage = interviewResources?.language === "en" ? "en" : "ar";
        return {
            interview_session_id: session.id,
            language: selectedLanguage,
        };
    }

    private resolveInterviewLanguages(raw: unknown): InterviewLanguage[] {
        const values = Array.isArray(raw) ? raw : [];
        const languages = new Set<InterviewLanguage>();
        const extractString = (value: unknown) => {
            if (typeof value === "string") return value;
            if (value && typeof value === "object") {
                const record = value as Record<string, unknown>;
                const candidate = record.value ?? record.label ?? record.name;
                return typeof candidate === "string" ? candidate : null;
            }
            return null;
        };
        values.forEach((value) => {
            const rawValue = extractString(value);
            if (!rawValue) return;
            const normalized = rawValue.toLowerCase().trim();

            // Detection for Arabic
            if (
                normalized.includes("arabic") ||
                normalized === "ar" ||
                normalized.includes("عربي") ||
                normalized.includes("العربية") ||
                /[\u0600-\u06FF]/.test(rawValue) // Any Arabic characters
            ) {
                languages.add(InterviewLanguage.ar);
            }

            // Detection for English
            if (
                normalized.includes("english") ||
                normalized === "en" ||
                /^[A-Za-z\s]+$/.test(rawValue) && (normalized.includes("eng") || normalized.includes("en"))
            ) {
                languages.add(InterviewLanguage.en);
            }
        });
        return Array.from(languages);
    }

    async createInterviewResources(invitationToken: string, language?: "ar" | "en") {
        const token = await this.prisma.invitationToken.findFirst({
            where: { token: invitationToken },
            select: {
                id: true,
                revoked: true,
                expires_at: true,
                invitation_id: true,
                status: true,
            },
        });

        if (!token || token.revoked || token.expires_at <= new Date()) {
            throw new BadRequestException("Invalid invitation token.");
        }

        const invitation = await this.prisma.invitation.findUnique({
            where: { id: token.invitation_id },
            include: {
                from: true,
                job: true,
                to: true,
            },
        });

        if (!invitation) {
            throw new BadRequestException("Invitation not found.");
        }

        const availableLanguages = this.resolveInterviewLanguages(invitation.job?.languages);
        const rawJobLanguages = Array.isArray(invitation.job?.languages) ? invitation.job.languages : [];
        const resolvedAvailable = availableLanguages.length > 0 ? availableLanguages : [];

        if ((resolvedAvailable.length > 1 || rawJobLanguages.length > 1) && !language) {
            return {
                invitation_token_id: token.id,
                available_languages: resolvedAvailable.length > 0 ? resolvedAvailable : [InterviewLanguage.ar, InterviewLanguage.en],
                requires_language_choice: true,
                job_snapshot: this.toJsonSnapshot(invitation.job),
            };
        }
        const requestedLanguage = language === "en" ? InterviewLanguage.en : InterviewLanguage.ar;
        let selectedLanguage: InterviewLanguage;
        if (resolvedAvailable.length === 0) {
            // Job language not set or unrecognized; default to requested or Arabic.
            selectedLanguage = language ? requestedLanguage : InterviewLanguage.ar;
        } else if (resolvedAvailable.length === 1) {
            selectedLanguage = resolvedAvailable[0];
        } else {
            if (!resolvedAvailable.includes(requestedLanguage)) {
                return {
                    invitation_token_id: token.id,
                    available_languages: resolvedAvailable,
                    requires_language_choice: true,
                    job_snapshot: this.toJsonSnapshot(invitation.job),
                };
            }
            selectedLanguage = requestedLanguage;
        }
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
                return {
                    ...existingResources,
                    available_languages: resolvedAvailable,
                    requires_language_choice: false,
                };
            }
        }

        const { from: agency, job, to: resume } = invitation;
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

        let preparedQuestions = await this.withTimeout(
            this.generateInterviewPreparedQuestions(
                job,
                resumeStructured,
                resumeAnalysis,
                agency,
                selectedLanguage
            ),
            5000,
            []
        );
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
            return {
                ...updatedResources,
                available_languages: resolvedAvailable,
                requires_language_choice: false,
            };
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
        return {
            ...createdResources,
            available_languages: resolvedAvailable,
            requires_language_choice: false,
        };
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

    async cancelInterviewSession(interviewSessionId: number) {
        const session = await this.prisma.interviewSession.findUnique({
            where: { id: interviewSessionId },
        });
        if (!session) {
            throw new BadRequestException("Interview session not found.");
        }
        if (session.status === InterviewSessionStatus.completed) {
            throw new BadRequestException("Interview session already completed.");
        }
        const [updatedSession] = await this.prisma.$transaction([
            this.prisma.interviewSession.update({
                where: { id: interviewSessionId },
                data: { status: InterviewSessionStatus.cancelled },
            }),
            this.prisma.invitationToken.update({
                where: { id: session.invitation_token_id },
                data: { revoked: true, status: InvitationTokenStatus.invalid },
            }),
        ]);
        return updatedSession;
    }

    async completeInterviewSession(interviewSessionId: number) {
        const session = await this.prisma.interviewSession.findUnique({
            where: { id: interviewSessionId },
        });
        if (!session) {
            throw new BadRequestException("Interview session not found.");
        }
        if (session.status === InterviewSessionStatus.completed) {
            return session;
        }
        if (session.status === InterviewSessionStatus.cancelled) {
            throw new BadRequestException("Interview session already cancelled.");
        }
        const [updatedSession] = await this.prisma.$transaction([
            this.prisma.interviewSession.update({
                where: { id: interviewSessionId },
                data: { status: InterviewSessionStatus.completed },
            }),
            this.prisma.invitationToken.update({
                where: { id: session.invitation_token_id },
                data: { revoked: true, status: InvitationTokenStatus.invalid },
            }),
        ]);
        return updatedSession;
    }

    async postponeInterviewSession(interviewSessionId: number) {
        const session = await this.prisma.interviewSession.findUnique({
            where: { id: interviewSessionId },
        });
        if (!session) {
            throw new BadRequestException("Interview session not found.");
        }
        if (session.status === InterviewSessionStatus.completed) {
            throw new BadRequestException("Interview session already completed.");
        }
        if (session.status === InterviewSessionStatus.cancelled) {
            throw new BadRequestException("Interview session already cancelled.");
        }
        const [updatedSession] = await this.prisma.$transaction([
            this.prisma.interviewSession.update({
                where: { id: interviewSessionId },
                data: { status: "postponed" as unknown as InterviewSessionStatus },
            }),
            this.prisma.invitationToken.update({
                where: { id: session.invitation_token_id },
                data: { revoked: true, status: InvitationTokenStatus.invalid },
            }),
        ]);
        return updatedSession;
    }

    async appendQaLogEntry(
        interviewSessionId: number,
        role: "assistant" | "user",
        content: string
    ) {
        if (!Number.isFinite(interviewSessionId) || interviewSessionId <= 0) {
            throw new BadRequestException("Invalid interview session id.");
        }
        let session: { qa_log: Prisma.JsonValue } | null = null;
        try {
            session = await this.prisma.interviewSession.findUnique({
                where: { id: interviewSessionId },
                select: { qa_log: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw new BadRequestException("Invalid interview session id.");
            }
            throw error;
        }
        if (!session) {
            throw new BadRequestException("Interview session not found.");
        }
        const qaLog = this.normalizeQaLog(session.qa_log);
        if (role === "assistant") {
            qaLog.push({ question: content, answer: "" });
        } else {
            const pendingIndex = [...qaLog].reverse().findIndex((entry) => !entry.answer);
            if (pendingIndex !== -1) {
                const index = qaLog.length - 1 - pendingIndex;
                qaLog[index].answer = content;
            } else {
                qaLog.push({ question: "Candidate response", answer: content });
            }
        }
        await this.prisma.interviewSession.update({
            where: { id: interviewSessionId },
            data: { qa_log: qaLog as unknown as Prisma.InputJsonValue },
        });
        return qaLog;
    }

    async createRealtimeSession(model = "gpt-4o-realtime-preview", voice = "ash") {
        const apiKey = this.configService.get<string>("env.openai.apiKey") ?? "";
        if (!apiKey) {
            throw new BadRequestException("OpenAI API key is not configured.");
        }
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ model, voice }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(
                `Failed to create realtime session: ${response.status} ${errorText}`
            );
        }
        return response.json();
    }


    // interview processing
    async IntiateSessionAndCreateChunk(interview_token: number) {
        let session = await this.prisma.interviewSession.findFirst({
            where: {
                invitation_token_id: interview_token,
            },
        });
        const resources = await this.prisma.interviewResources.findFirst({
            where: { invitation_token_id: interview_token },
            select: { language: true },
        });
        const sessionLanguage = resources?.language === "en" ? "en" : "ar";
        if (session) {
            if (session.status !== InterviewSessionStatus.active) {
                throw new BadRequestException("Interview session is not active or completed.");
            }
            if (session.language !== sessionLanguage) {
                await this.prisma.interviewSession.update({
                    where: { id: session.id },
                    data: { language: sessionLanguage },
                });
            }
            if (!session.agency_id) {
                const token = await this.prisma.invitationToken.findUnique({
                    where: { id: interview_token },
                    select: {
                        invitation: {
                            select: {
                                from_id: true,
                            },
                        },
                    },
                });
                if (!token?.invitation?.from_id) {
                    throw new BadRequestException("Interview session is missing agency.");
                }
                await this.prisma.interviewSession.update({
                    where: { id: session.id },
                    data: { agency_id: token.invitation.from_id },
                });
            }
        } else {
            const token = await this.prisma.invitationToken.findUnique({
                where: { id: interview_token },
                select: {
                    invitation: {
                        select: {
                            from_id: true,
                        },
                    },
                },
            });
            if (!token?.invitation?.from_id) {
                throw new BadRequestException("Interview session requires agency.");
            }
            session = await this.prisma.interviewSession.create({
                data: {
                    invitation_token_id: interview_token,
                    agency_id: token.invitation.from_id,
                    language: sessionLanguage,
                    qa_log: [],
                },
            });
        }
        const chunksDirectoryName = getSessionChunksDirectory(session.id);
        await this.prisma.interviewSession.update({
            where: {
                id: session.id,
            },
            data: {
                chunks_directory_name: chunksDirectoryName,
            }
        });
    }

    async AddAudioChunk(interview_session_id: number, groupIndex: number | undefined, chunk: Buffer) {
        const session = await this.prisma.interviewSession.findUnique({
            where: {
                id: interview_session_id
            }
        })
        if (!session) {
            throw new BadRequestException("Failed to find interview session.");
        }
        if (session.status !== InterviewSessionStatus.active) {
            throw new BadRequestException("Interview session is not active or completed.");
        }
        let chunksDirectoryName = session.chunks_directory_name;
        if (!chunksDirectoryName) {
            // create chunks directory
            chunksDirectoryName = getSessionChunksDirectory(session.id);
            await this.prisma.interviewSession.update({
                where: {
                    id: session.id,
                },
                data: {
                    chunks_directory_name: chunksDirectoryName,
                }
            });
        }
        const resolvedGroupIndex =
            groupIndex ?? getLatestAnswerGroupIndex(chunksDirectoryName);
        const chunkFilePath = await writeAudioChunkToFile(
            chunksDirectoryName,
            resolvedGroupIndex,
            chunk
        );
    }

    async EndSessionGroup(interview_session_id: number, groupIndex?: number, includeSpeech = true) {
        const session = await this.prisma.interviewSession.findUnique({
            where: {
                id: interview_session_id
            }
        })
        if (!session) {
            throw new BadRequestException("Failed to find interview session.");
        }
        if (session.status !== InterviewSessionStatus.active) {
            throw new BadRequestException("Interview session is not active or completed.");
        }
        let chunksDirectoryName = session.chunks_directory_name;
        if (!chunksDirectoryName) {
            // create chunks directory if missing to keep behavior consistent
            chunksDirectoryName = getSessionChunksDirectory(session.id);
            await this.prisma.interviewSession.update({
                where: {
                    id: session.id,
                },
                data: {
                    chunks_directory_name: chunksDirectoryName,
                }
            });
        }

        const resolvedGroupIndex =
            groupIndex ?? getLatestAnswerGroupIndex(chunksDirectoryName);
        let combinedFilePath: string;
        try {
            combinedFilePath = combineAnswerGroupChunks(
                chunksDirectoryName,
                resolvedGroupIndex
            );
        } catch (error) {
            if (error instanceof Error) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException("Failed to combine chunks.");
        }

        const audioBuffer = fs.readFileSync(combinedFilePath);
        const audioFile = {
            buffer: audioBuffer,
            originalname: path.basename(combinedFilePath),
            mimetype: "audio/wav",
        };

        const interviewResources = await this.prisma.interviewResources.findFirst({
            where: { invitation_token_id: session.invitation_token_id },
            select: { language: true },
        });
        const transcription = await this.speechService.transcribeAudio(
            audioFile,
            interviewResources?.language
        );

        const qaLog = this.normalizeQaLog(session.qa_log);
        const pendingIndex = [...qaLog].reverse().findIndex((entry) => !entry.answer);
        let lastAnsweredQuestion = "";
        if (qaLog.length === 0) {
            const firstQuestion = await this.generateNextInterviewQuestion(
                session.invitation_token_id,
                []
            );
            qaLog.push({
                question: firstQuestion,
                answer: transcription.text ?? "",
            });
            lastAnsweredQuestion = firstQuestion;
        } else if (pendingIndex !== -1) {
            const index = qaLog.length - 1 - pendingIndex;
            qaLog[index].answer = transcription.text ?? "";
            lastAnsweredQuestion = qaLog[index].question;
        } else {
            qaLog.push({
                question: "Candidate response",
                answer: transcription.text ?? "",
            });
        }

        const interviewLanguage = interviewResources?.language === "en" ? "en" : "ar";
        if (lastAnsweredQuestion && this.isSalaryQuestion(lastAnsweredQuestion)) {
            const closingMessage = this.buildClosingMessage(interviewLanguage);
            const closingSpeech = includeSpeech
                ? await this.speechService.synthesizeSpeech(
                    closingMessage,
                    "ash",
                    "wav",
                    interviewLanguage
                )
                : null;
            qaLog.push({ question: closingMessage, answer: "" });
            await this.prisma.interviewSession.update({
                where: { id: session.id },
                data: {
                    qa_log: qaLog as unknown as Prisma.InputJsonValue,
                    status: InterviewSessionStatus.completed,
                },
            });
            return {
                combined_file_path: combinedFilePath,
                transcript: transcription.text,
                interview_ended: true,
                closing_message: closingMessage,
                closing_audio: closingSpeech?.audioBuffer,
                closing_content_type: closingSpeech?.contentType,
                interview_language: interviewLanguage,
                group_index: resolvedGroupIndex,
            };
        }

        const nextQuestion = await this.generateNextInterviewQuestion(
            session.invitation_token_id,
            qaLog
        );
        qaLog.push({ question: nextQuestion, answer: "" });

        const nextQuestionSpeech = includeSpeech
            ? await this.speechService.synthesizeSpeech(
                nextQuestion,
                "ash",
                "wav",
                interviewLanguage
            )
            : null;

        // Advance to the next group folder for the upcoming answer
        getAnswerGroupDirectory(chunksDirectoryName, resolvedGroupIndex + 1, true);

        await this.prisma.interviewSession.update({
            where: { id: session.id },
            data: { qa_log: qaLog as unknown as Prisma.InputJsonValue },
        });

        return {
            combined_file_path: combinedFilePath,
            transcript: transcription.text,
            interview_ended: false,
            next_question: nextQuestion,
            next_question_audio: nextQuestionSpeech?.audioBuffer,
            next_question_content_type: nextQuestionSpeech?.contentType,
            interview_language: interviewLanguage,
            group_index: resolvedGroupIndex,
        };
    }

    async getInterviewSessions(options: GetInterviewSessionsDto, agencyId: number) {
        const { page = 1, limit = 10, sort_by, sort_order, search } = options;
        const sortBy = sort_by ?? "created_at";
        const sortOrder = sort_order ?? "desc";
        const orderBy: Prisma.InterviewSessionOrderByWithRelationInput =
            sortBy === "expires_at"
                ? { invitation_token: { expires_at: sortOrder } }
                : { [sortBy]: sortOrder };

        const statusFilter = {
            in: [
                InterviewSessionStatus.postponed,
                InterviewSessionStatus.cancelled,
                InterviewSessionStatus.completed,
            ],
        };

        const where: Prisma.InterviewSessionWhereInput = {
            status: statusFilter,
            invitation_token: {
                is: {
                    invitation: {
                        from_id: agencyId,
                    },
                    ...(search
                        ? {
                            candidate: {
                                is: {
                                    OR: [
                                        { email: { contains: search, mode: "insensitive" } },
                                        { candidate_name: { contains: search, mode: "insensitive" } },
                                        { f_name: { contains: search, mode: "insensitive" } },
                                        { l_name: { contains: search, mode: "insensitive" } },
                                    ],
                                },
                            },
                        }
                        : {}),
                },
            },
        };

        const pagination = await this.paginationHelper.applyPagination(options);
        const sessions = await this.prisma.interviewSession.findMany({
            where,
            include: {
                invitation_token: {
                    include: {
                        candidate: {
                            select: {
                                email: true,
                                candidate_name: true,
                                f_name: true,
                                l_name: true,
                            },
                        },
                    },
                },
            },
            orderBy,
            ...pagination,
        });
        const paginationMeta = await this.paginationHelper.generatePaginationMeta(
            options,
            Prisma.ModelName.InterviewSession,
            where
        );

        const items = sessions.map((session) => {
            const candidate = session.invitation_token?.candidate ?? null;
            const name =
                candidate?.candidate_name ||
                [candidate?.f_name, candidate?.l_name].filter(Boolean).join(" ") ||
                null;
            return {
                id: session.id,
                status: session.status,
                created_at: session.created_at,
                updated_at: session.updated_at,
                candidate: candidate
                    ? {
                        name,
                        email: candidate.email ?? null,
                    }
                    : null,
            };
        });

        return responseFormatter(
            items,
            paginationMeta,
            "Interview sessions retrieved.",
            200
        );
    }
}