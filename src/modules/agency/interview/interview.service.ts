import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { InterviewGeneratedProfileStatus, InterviewSessionStatus, Prisma } from "@generated/prisma";
import { Queue } from "bullmq";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { PaginationHelper } from "src/shared/helpers/features/pagination";
import responseFormatter from "src/shared/helpers/response";
import { GetInterviewSessionsDto } from "./dto/get-interview-sessions.dto";
import { GetInterviewStatsDto } from "./dto/get-interview-stats.dto";

@Injectable()
export class AgencyInterviewService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationHelper: PaginationHelper,
        @InjectQueue("candidate_interview_generated_profile")
        private readonly generatedProfileQueue: Queue<{ interviewSessionId: number }>
    ) { }

    async getInterviewSessions(options: GetInterviewSessionsDto, userId: number) {
        const { sort_by, sort_order, search, agency_id, status, date } = options;
        const sortBy = sort_by ?? "created_at";
        const sortOrder = sort_order ?? "desc";
        const orderBy: Prisma.InterviewSessionOrderByWithRelationInput =
            sortBy === "expires_at"
                ? { invitation_token: { expires_at: sortOrder } }
                : { [sortBy]: sortOrder };

        const buildWhere = (
            statuses: InterviewSessionStatus[]
        ): Prisma.InterviewSessionWhereInput => {
            const filters: Prisma.InterviewSessionWhereInput[] = [];
            filters.push({
                agency: {
                    OR: [
                        // Agency owner
                        {
                            account: {
                                is: { id: userId },
                            },
                        },
                        // Team member linked to this agency
                        {
                            team: {
                                is: {
                                    members: {
                                        some: {
                                            account: {
                                                is: { id: userId },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
            });
            if (search) {
                filters.push({
                    invitation_token: {
                        is: {
                            candidate: {
                                is: {
                                    OR: [
                                        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
                                        { candidate_name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                                        { f_name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                                        { l_name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                                    ],
                                },
                            },
                        },
                    },
                });
            }
            if (date) {
                const start = new Date(date);
                start.setUTCHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setUTCDate(end.getUTCDate() + 1);
                filters.push({ created_at: { gte: start, lt: end } });
            }
            return {
                ...(statuses.length ? { status: { in: statuses } } : {}),
                ...(filters.length ? { AND: filters } : {}),
            };
        };

        const fetchWithStatuses = async (statuses: InterviewSessionStatus[]) => {
            const where = buildWhere(statuses);
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
                            invitation: {
                                include: {
                                    job: {
                                        select: {
                                            title: true,
                                        },
                                    },
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
                    job_title: session.invitation_token?.invitation?.job?.title ?? null,
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
        };

        const defaultStatuses = [
            InterviewSessionStatus.postponed,
            InterviewSessionStatus.cancelled,
            InterviewSessionStatus.completed,
            InterviewSessionStatus.active,
            InterviewSessionStatus.inactive,
        ];

        const statuses = status ? [status] : defaultStatuses;

        try {
            return await fetchWithStatuses(statuses);
        } catch (error) {
            const isEnumError =
                error instanceof Prisma.PrismaClientKnownRequestError &&
                typeof error.message === "string" &&
                error.message.toLowerCase().includes("enum");
            if (isEnumError && statuses.includes(InterviewSessionStatus.postponed)) {
                return await fetchWithStatuses(
                    statuses.filter(s => s !== InterviewSessionStatus.postponed)
                );
            }
            throw error;
        }
    }

    async getInterviewStatistics(options: GetInterviewStatsDto, userId: number) {
        const { agency_id } = options;
        const scopedAgencyId = Number.isFinite(Number(agency_id))
            ? Number(agency_id)
            : null;

        const baseWhere: Prisma.InterviewSessionWhereInput = scopedAgencyId
            ? { agency_id: scopedAgencyId }
            : {
                agency: {
                    account: {
                        is: { id: userId },
                    },
                },
            };

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const dayOfWeek = startOfDay.getDay();
        const diffToMonday = startOfDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(diffToMonday);

        const [
            totalScheduled,
            interviewsToday,
            interviewsThisWeek,
            completedInterviews,
            cancelledInterviews
        ] = await Promise.all([
            this.prisma.interviewSession.count({ where: baseWhere }),
            this.prisma.interviewSession.count({
                where: {
                    ...baseWhere,
                    created_at: {
                        gte: startOfDay
                    }
                }
            }),
            this.prisma.interviewSession.count({
                where: {
                    ...baseWhere,
                    created_at: {
                        gte: startOfWeek
                    }
                }
            }),
            this.prisma.interviewSession.count({
                where: {
                    ...baseWhere,
                    status: InterviewSessionStatus.completed
                }
            }),
            this.prisma.interviewSession.count({
                where: {
                    ...baseWhere,
                    status: InterviewSessionStatus.cancelled
                }
            })
        ]);

        return responseFormatter(
            {
                total_scheduled: totalScheduled,
                interviews_today: interviewsToday,
                interviews_this_week: interviewsThisWeek,
                completed_interviews: completedInterviews,
                cancelled_interviews: cancelledInterviews
            },
            null,
            "Interview statistics retrieved.",
            200
        );
    }

    async getInterviewSessionDetails(sessionId: number, userId: number) {
        const session = await this.prisma.interviewSession.findFirst({
            where: {
                id: sessionId,
                agency: {
                    account: {
                        is: { id: userId },
                    },
                },
            },
            include: {
                invitation_token: {
                    include: {
                        candidate: {
                            include: {
                                profile: {
                                    include: {
                                        experiences: true,
                                        projects: true,
                                        social_links: true,
                                    },
                                },
                            },
                        },
                        invitation: {
                            include: {
                                job: {
                                    select: {
                                        id: true,
                                        title: true,
                                        description: true,
                                    },
                                },
                                to: {
                                    select: {
                                        id: true,
                                        name: true,
                                        link: true,
                                        file_type: true,
                                        created_at: true,
                                        updated_at: true,
                                        resume_analysis: {
                                            select: {
                                                score: true,
                                                seniority_level: true,
                                                recommendation: true,
                                                insights: true,
                                                createdAt: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!session) {
            return responseFormatter(null, null, "Interview session not found.", 404);
        }

        const token = session.invitation_token;
        const candidate = token?.candidate ?? null;
        const name =
            candidate?.candidate_name ||
            [candidate?.f_name, candidate?.l_name].filter(Boolean).join(" ") ||
            null;

        return responseFormatter(
            {
                id: session.id,
                status: session.status,
                language: session.language,
                generated_profile_status: session.generated_profile_status,
                generated_profile: session.generated_profile,
                generated_profile_error: session.generated_profile_error,
                generated_profile_generated_at: session.generated_profile_generated_at,
                created_at: session.created_at,
                updated_at: session.updated_at,
                invitation_token: token
                    ? {
                        status: token.status,
                        revoked: token.revoked,
                        expires_at: token.expires_at,
                    }
                    : null,
                job: token?.invitation?.job ?? null,
                resume: token?.invitation?.to ?? null,
                candidate: candidate
                    ? {
                        id: candidate.id,
                        name,
                        email: candidate.email ?? null,
                        phone: candidate.phone ?? null,
                        profile: candidate.profile ?? null,
                    }
                    : null,
            },
            null,
            "Interview session retrieved.",
            200
        );
    }

    async generateProfileNow(sessionId: number, userId: number) {
        const session = await this.prisma.interviewSession.findFirst({
            where: {
                id: sessionId,
                agency: {
                    account: {
                        is: { id: userId },
                    },
                },
            },
            select: {
                id: true,
                status: true,
                generated_profile_status: true,
            },
        });

        if (!session) {
            return responseFormatter(null, null, "Interview session not found.", 404);
        }

        if (session.status !== InterviewSessionStatus.completed) {
            return responseFormatter(
                null,
                null,
                "Generated profile can only be triggered for completed interviews.",
                400
            );
        }

        if (
            session.generated_profile_status === InterviewGeneratedProfileStatus.queued ||
            session.generated_profile_status === InterviewGeneratedProfileStatus.processing
        ) {
            return responseFormatter(
                {
                    interview_session_id: session.id,
                    generated_profile_status: session.generated_profile_status,
                },
                null,
                "Generated profile is already in progress.",
                200
            );
        }

        await this.prisma.interviewSession.update({
            where: { id: session.id },
            data: {
                generated_profile_status: InterviewGeneratedProfileStatus.queued,
                generated_profile_error: null,
            },
        });

        await this.generatedProfileQueue.add(
            "candidate-generated-profile",
            { interviewSessionId: session.id },
            {
                jobId: `candidate-generated-profile-${session.id}`,
                attempts: 2,
                removeOnComplete: true,
                removeOnFail: false,
                backoff: {
                    type: "exponential",
                    delay: 1000,
                },
            }
        );

        return responseFormatter(
            {
                interview_session_id: session.id,
                generated_profile_status: InterviewGeneratedProfileStatus.queued,
            },
            null,
            "Generated profile queued successfully.",
            200
        );
    }
}

