import { Prisma, ResumeFileTypes } from '@generated/prisma';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ResumeProducer } from 'src/queues/agency/resume/resume.producer';
import { GetResumesDto } from './dto/get-resumes.dto';
import { FilterHelper } from 'src/shared/helpers/features/filter';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import responseFormatter from 'src/shared/helpers/response';
import { DenyResumeDto } from './dto/deny-resume.dto';
import { ShortlistResumeDto } from './dto/shortlist-resume.dto';
import { InviteResumeDto } from './dto/invite-resume.dto';
import { InvitationService } from 'src/modules/agency/invitation/invitation.service';
import { AiCallProducer } from 'src/queues/agency/ai-call/ai-call.producer';

@Injectable()
export class ResumeService {
    private readonly logger = new Logger(ResumeService.name);
    constructor(
        private readonly resumeProducer: ResumeProducer,
        private readonly prisma: PrismaService,
        private readonly filterHelper: FilterHelper,
        private readonly paginationHelper: PaginationHelper,
        private readonly invitationService: InvitationService,
        private readonly aiCallProducer: AiCallProducer,
    ) { }

    private async getAgencyId(accountId: number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: {
                agency_id: true,
                teamMember: {
                    select: {
                        team: {
                            select: {
                                agency: {
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        // Case 1: Agency owner
        if (account?.agency_id) {
            return account.agency_id;
        }

        // Case 2: Team member
        const teamAgencyId =
            account?.teamMember?.team?.agency?.id ?? null;

        if (teamAgencyId) {
            return teamAgencyId;
        }

        throw new BadRequestException("Agency not found.");
    }

    private async getResumeForAction(resumeId: number, userId: number) {
        const agencyId = await this.getAgencyId(userId);
        const resume = await this.prisma.resume.findFirst({
            where: {
                id: resumeId,
                job: {
                    agency_id: agencyId,
                },
            },
            select: {
                id: true,
                name: true,
                link: true,
                auto_denied: true,
                auto_shortlisted: true,
                auto_invited: true,
                job: {
                    select: {
                        agency_id: true,
                        title: true,
                        agency: {
                            select: {
                                company_name: true,
                            },
                        },
                    },
                },
                resume_structured: {
                    select: {
                        data: true,
                    },
                },
            },
        });
        if (!resume) {
            throw new NotFoundException("Resume not found");
        }
        return resume;
    }

    async processResumes(files: Express.Multer.File[], jobId: number, userId: number) {
        try {
            const agencyId = await this.getAgencyId(userId);
            const job = await this.prisma.job.findFirst({
                where: {
                    id: jobId,
                    agency_id: agencyId,
                },
                select: { id: true },
            });
            if (!job) {
                throw new NotFoundException('Job not found');
            }
            this.logger.log(`Processing ${files.length} resume file(s).`);
            const araangedFiles = files.map((file) => {
                const mimetype = file.mimetype.toLowerCase();
                const originalName = file.originalname.toLowerCase();
                const isSpreadsheet =
                    mimetype.includes("sheet") ||
                    mimetype.includes("excel") ||
                    mimetype.includes("spreadsheet");
                const isDoc =
                    mimetype.includes("word") ||
                    mimetype.includes("officedocument.wordprocessingml") ||
                    mimetype.includes("msword") ||
                    originalName.endsWith(".doc") ||
                    originalName.endsWith(".docx");
                const isPdf =
                    mimetype.includes("pdf") ||
                    originalName.endsWith(".pdf");

                const fileType = isSpreadsheet
                    ? ResumeFileTypes.xlsx
                    : (isPdf || isDoc)
                        ? ResumeFileTypes.pdf
                        : ResumeFileTypes.pdf;

                return {
                    name: file.originalname,
                    file_type: fileType,
                    link: file.filename,
                    job_id: jobId,
                    updated_by: userId,
                };
            });
            const createResult = await this.prisma.resume.createMany({
                data: araangedFiles,
            });
            if (!createResult || createResult.count === 0) {
                throw new BadRequestException('Failed to save resumes');
            }
            this.logger.log(`Saved ${createResult.count} resume record(s).`);
            const createdResumes = await this.prisma.resume.findMany({
                where: {
                    link: { in: araangedFiles.map((file) => file.link) },
                },
                select: { id: true, name: true, file_type: true, link: true },
            });
            this.logger.log(`Dispatching ${createdResumes.length} resume(s) to queue.`);
            await this.resumeProducer.processResumes(createdResumes, jobId);
        } catch (error) {
            this.logger.error('Failed to process resumes.', error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }

    async getResumes(getResumesDto: GetResumesDto, userId: number) {
        const agencyId = await this.getAgencyId(userId);
        const partialMatching = getResumesDto.partial_matching?.trim();
        const filters: Prisma.ResumeWhereInput[] = [];
        filters.push({
            job: {
                agency_id: agencyId,
            },
        });

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

        if (typeof getResumesDto.score === "number" && !Number.isNaN(getResumesDto.score)) {
            filters.push({
                resume_analysis: {
                    is: {
                        score: {
                            gte: getResumesDto.score,
                        },
                    },
                },
            });
        }

        if (getResumesDto.recommendation) {
            filters.push({
                resume_analysis: {
                    is: {
                        recommendation: getResumesDto.recommendation,
                    },
                },
            });
        }

        if (typeof getResumesDto.job_id === "number" && !Number.isNaN(getResumesDto.job_id)) {
            filters.push({
                job_id: getResumesDto.job_id,
            });
        }

        if (typeof getResumesDto.auto_invited === "boolean") {
            filters.push({ auto_invited: getResumesDto.auto_invited });
        }

        if (typeof getResumesDto.auto_shortlisted === "boolean") {
            filters.push({ auto_shortlisted: getResumesDto.auto_shortlisted });
        }

        if (typeof getResumesDto.auto_denied === "boolean") {
            filters.push({ auto_denied: getResumesDto.auto_denied });
        }

        const filterObject: Prisma.ResumeWhereInput =
            filters.length > 0 ? { AND: filters } : {};

        const sortOrder: Prisma.SortOrder =
            getResumesDto.sort_order === "desc"
                ? Prisma.SortOrder.desc
                : Prisma.SortOrder.asc;
        const sortingObject = getResumesDto.sort_by
            ? { [getResumesDto.sort_by]: sortOrder }
            : { created_at: Prisma.SortOrder.desc };

        const pagination = await this.paginationHelper.applyPagination(getResumesDto);
        const resumes = await this.prisma.resume.findMany({
            where: filterObject,
            orderBy: sortingObject,
            include: {
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
            const data = resume_structured?.data as any;
            return {
                ...rest,
                structured_name: data?.name ?? null,
                structured_email: data?.contact?.email ?? null,
            };
        });

        const paginationMeta = await this.paginationHelper.generatePaginationMeta(
            getResumesDto,
            Prisma.ModelName.Resume,
            filterObject,
        );
        return responseFormatter(
            resumesWithStructured,
            paginationMeta,
            "Resumes fetched successfully",
            200
        );
    }

    async getResume(id: number, userId: number) {
        const agencyId = await this.getAgencyId(userId);
        const resume = await this.prisma.resume.findFirst({
            where: {
                id,
                job: {
                    agency_id: agencyId,
                },
            },
            select: {
                id: true,
                name: true,
                link: true,
                created_at: true,
                resume_structured: {
                    select: {
                        data: true,
                    },
                },
                resume_analysis: {
                    select: {
                        score: true,
                        seniority_level: true,
                        recommendation: true,
                        insights: true,
                    },
                },
            },
        });

        if (!resume) {
            throw new NotFoundException("Resume not found");
        }

        return responseFormatter(
            resume,
            null,
            "Resume fetched successfully",
            200
        );
    }

    async getResumeDetails(id: number, userId: number) {
        const agencyId = await this.getAgencyId(userId);
        const resume = await this.prisma.resume.findFirst({
            where: {
                id,
                job: {
                    agency_id: agencyId,
                },
            },
            select: {
                id: true,
                name: true,
                link: true,
                created_at: true,
                auto_denied: true,
                auto_shortlisted: true,
                auto_invited: true,
                resume_structured: {
                    select: {
                        data: true,
                    },
                },
                resume_analysis: {
                    select: {
                        score: true,
                        seniority_level: true,
                        recommendation: true,
                        insights: true,
                    },
                },
            },
        });

        if (!resume) {
            throw new NotFoundException("Resume not found");
        }

        return responseFormatter(
            resume,
            null,
            "Resume details fetched successfully",
            200
        );
    }

    async denyResume(resumeId: number, userId: number, dto: DenyResumeDto) {
        if (typeof dto.auto_denied !== "boolean") {
            throw new BadRequestException("auto_denied must be boolean.");
        }
        const resume = await this.getResumeForAction(resumeId, userId);
        const updated = await this.prisma.resume.update({
            where: { id: resume.id },
            data: { auto_denied: dto.auto_denied, updated_by: userId },
        });
        return responseFormatter(updated, null, "Resume updated successfully", 200);
    }

    async shortlistResume(resumeId: number, userId: number, dto: ShortlistResumeDto) {
        if (typeof dto.auto_shortlisted !== "boolean") {
            throw new BadRequestException("auto_shortlisted must be boolean.");
        }
        const resume = await this.getResumeForAction(resumeId, userId);
        if (resume.auto_denied && dto.auto_shortlisted) {
            throw new BadRequestException("Resume is denied. Remove deny before shortlisting.");
        }
        const updated = await this.prisma.resume.update({
            where: { id: resume.id },
            data: { auto_shortlisted: dto.auto_shortlisted, updated_by: userId },
        });
        return responseFormatter(updated, null, "Resume updated successfully", 200);
    }

    async inviteResume(resumeId: number, userId: number, dto: InviteResumeDto) {
        const resume = await this.getResumeForAction(resumeId, userId);
        if (resume.auto_denied) {
            throw new BadRequestException("Resume is denied. Remove deny before inviting.");
        }
        const structured = resume.resume_structured?.data as
            | {
                name?: string | null;
                email?: string | null;
                Email?: string | null;
                contact?: { email?: string | null } | null
            }
            | null
            | undefined;
        const recipientEmail =
            dto.recipient_email ??
            structured?.contact?.email ??
            structured?.email ??
            structured?.Email ??
            null;
        if (!recipientEmail) {
            throw new BadRequestException("Recipient email is required.");
        }
        const recipientName = dto.recipient_name ?? structured?.name ?? undefined;
        await this.invitationService.createInvitationFromEndpoint(
            resume.job.agency_id,
            resume.id,
            recipientEmail,
            recipientName,
            userId
        );
        const updated = await this.prisma.resume.update({
            where: { id: resume.id },
            data: {
                auto_shortlisted: true,
                auto_invited: true,
                updated_by: userId,
            },
        });
        return responseFormatter(updated, null, "Invitation sent successfully", 200);
    }

    async scheduleAiCall(resumeId: number, userId: number, dto?: { scheduledAt?: string }) {
        const resume = await this.getResumeForAction(resumeId, userId);

        if (resume.auto_denied) {
            throw new BadRequestException("Resume is denied. Remove deny before scheduling a call.");
        }

        // Require an invitation to exist before scheduling a call
        const invitation = await this.prisma.invitation.findUnique({
            where: { to_id: resume.id },
            select: {
                id: true,
                job: {
                    select: {
                        id: true,
                        title: true,
                        agency: {
                            select: {
                                company_name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!invitation) {
            throw new BadRequestException("Candidate has not been invited yet. Send an invitation first.");
        }

        const structured = resume.resume_structured?.data as
            | {
                name?: string | null;
                phone?: string | null;
                Phone?: string | null;
                contact?: {
                    email?: string | null;
                    Email?: string | null;
                    phone?: string | null;
                    Phone?: string | null;
                } | null;
            }
            | null
            | undefined;

        const candidateName = structured?.name ?? resume.name ?? null;
        const phone =
            structured?.contact?.phone ??
            structured?.contact?.Phone ??
            structured?.phone ??
            structured?.Phone ??
            null;

        if (!phone) {
            throw new BadRequestException("No phone number found for this candidate in the parsed resume.");
        }

        const jobTitle = invitation.job?.title ?? null;
        const companyName = invitation.job?.agency?.company_name ?? null;

        let delayMs = 0;
        if (dto?.scheduledAt) {
            const scheduledDate = new Date(dto.scheduledAt);
            if (!Number.isNaN(scheduledDate.getTime())) {
                delayMs = scheduledDate.getTime() - Date.now();
            }
        }

        await this.aiCallProducer.scheduleInterviewReminderCall(
            {
                resumeId: resume.id,
                jobId: invitation.job?.id ?? null,
                agencyId: resume.job.agency_id,
                toPhoneNumber: `+20${phone}`,
                candidateName,
                jobTitle,
                companyName,
            },
            delayMs,
        );

        return responseFormatter(
            { ...resume, auto_invited: true },
            null,
            "AI call scheduled successfully",
            200,
        );
    }
}