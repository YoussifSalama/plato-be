import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma, InboxSeverity, InboxStatus, InboxType, ResumeAiBatchStatus, InterviewSessionStatus } from "@generated/prisma";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { InboxEventsService } from "./inbox.events.service";
import { PaginationHelper } from "src/shared/helpers/features/pagination";
import responseFormatter from "src/shared/helpers/response";
import { GetInboxDto } from "./dto/get-inbox.dto";

type BatchInboxInput = {
    agencyId: number;
    jobId?: number | null;
    batchId: number;
    status: ResumeAiBatchStatus;
    openAiBatchId?: string | null;
};

type ApplicationInboxInput = {
    agencyId: number;
    jobId: number;
    jobApplicationId: number;
    candidateName: string;
    jobTitle: string;
};

type InterviewInboxInput = {
    agencyId: number;
    jobId: number;
    interviewSessionId: number;
    status: InterviewSessionStatus;
    candidateName: string;
    jobTitle: string;
};

@Injectable()
export class InboxService {
    private readonly logger = new Logger(InboxService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly inboxEvents: InboxEventsService,
        private readonly paginationHelper: PaginationHelper,
    ) { }

    private resolveBatchSeverity(status: ResumeAiBatchStatus) {
        switch (status) {
            case ResumeAiBatchStatus.failed:
                return InboxSeverity.error;
            case ResumeAiBatchStatus.cancelled:
            case ResumeAiBatchStatus.expired:
                return InboxSeverity.warning;
            case ResumeAiBatchStatus.completed:
            case ResumeAiBatchStatus.pending:
            default:
                return InboxSeverity.info;
        }
    }

    private buildBatchMessage(
        status: ResumeAiBatchStatus,
        _openAiBatchId?: string | null,
        jobTitle?: string | null,
    ) {
        const label = status.replace("_", " ");
        const title = `Resume batch ${label}`;
        const description = jobTitle
            ? `Resume analysis for ${jobTitle} is ${label}.`
            : `Resume analysis batch is ${label}.`;
        return { title, description };
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

    async getInboxAgency(accountId: number) {
        const agencyId = await this.getAgencyId(accountId);
        return responseFormatter(
            { agency_id: agencyId },
            undefined,
            "Agency id retrieved.",
            200,
        );
    }

    async getInboxes(accountId: number, dto: GetInboxDto) {
        const agencyId = await this.getAgencyId(accountId);
        const filters: Prisma.InboxWhereInput[] = [{ agency_id: agencyId }];
        if (dto.status) {
            filters.push({ status: dto.status });
        }
        if (dto.type) {
            filters.push({ type: dto.type });
        }
        const filterObject: Prisma.InboxWhereInput =
            filters.length > 0 ? { AND: filters } : {};

        const sortOrder: Prisma.SortOrder =
            dto.sort_order === "asc"
                ? Prisma.SortOrder.asc
                : Prisma.SortOrder.desc;
        const sortingObject = dto.sort_by
            ? { [dto.sort_by]: sortOrder }
            : { created_at: Prisma.SortOrder.desc };

        const pagination = await this.paginationHelper.applyPagination(dto);
        const inboxes = await this.prisma.inbox.findMany({
            where: filterObject,
            orderBy: sortingObject,
            include: {
                job: { select: { id: true, title: true } },
                batch: { select: { id: true, batch_id: true, status: true, ai_meta: true } },
            },
            ...pagination,
        });
        const meta = await this.paginationHelper.generatePaginationMeta(
            dto,
            Prisma.ModelName.Inbox,
            filterObject,
        );
        return responseFormatter(inboxes, meta, "Inbox fetched successfully.", 200);
    }

    async archiveInbox(accountId: number, inboxId: number) {
        const agencyId = await this.getAgencyId(accountId);
        const inbox = await this.prisma.inbox.findFirst({
            where: { id: inboxId, agency_id: agencyId },
            select: { id: true },
        });
        if (!inbox) {
            throw new BadRequestException("Inbox item not found.");
        }
        return this.prisma.inbox.update({
            where: { id: inboxId },
            data: { status: InboxStatus.archived },
        });
    }

    async unarchiveInbox(accountId: number, inboxId: number) {
        const agencyId = await this.getAgencyId(accountId);
        const inbox = await this.prisma.inbox.findFirst({
            where: { id: inboxId, agency_id: agencyId },
            select: { id: true },
        });
        if (!inbox) {
            throw new BadRequestException("Inbox item not found.");
        }
        return this.prisma.inbox.update({
            where: { id: inboxId },
            data: { status: InboxStatus.read },
        });
    }

    async markInboxRead(accountId: number, inboxId: number) {
        const agencyId = await this.getAgencyId(accountId);
        const inbox = await this.prisma.inbox.findFirst({
            where: { id: inboxId, agency_id: agencyId },
            select: { id: true },
        });
        if (!inbox) {
            throw new BadRequestException("Inbox item not found.");
        }
        return this.prisma.inbox.update({
            where: { id: inboxId },
            data: { status: InboxStatus.read },
        });
    }

    async markAllRead(accountId: number) {
        const agencyId = await this.getAgencyId(accountId);
        const result = await this.prisma.inbox.updateMany({
            where: { agency_id: agencyId, status: InboxStatus.unread },
            data: { status: InboxStatus.read },
        });
        return responseFormatter(
            { updated: result.count },
            undefined,
            "All inbox items marked as read.",
            200,
        );
    }

    async createBatchStatusInbox(input: BatchInboxInput) {
        const jobTitle = input.jobId
            ? (await this.prisma.job.findUnique({
                where: { id: input.jobId },
                select: { title: true },
            }))?.title ?? null
            : null;
        const { title, description } = this.buildBatchMessage(
            input.status,
            input.openAiBatchId,
            jobTitle,
        );
        const existing = await this.prisma.inbox.findFirst({
            where: {
                batch_id: input.batchId,
                type: InboxType.batch,
                title,
            },
        });
        if (existing) {
            return existing;
        }
        const severity = this.resolveBatchSeverity(input.status);
        const inbox = await this.prisma.inbox.create({
            data: {
                type: InboxType.batch,
                status: InboxStatus.unread,
                severity,
                title,
                description,
                agency_id: input.agencyId,
                job_id: input.jobId ?? null,
                batch_id: input.batchId,
            },
        });
        this.logger.log(
            `Created batch inbox (batchId=${input.batchId}, status=${input.status}, agencyId=${input.agencyId}).`,
        );
        await this.inboxEvents.emitInboxCreated(input.agencyId, {
            id: inbox.id,
            type: inbox.type,
            status: inbox.status,
            severity: inbox.severity,
            title: inbox.title,
            description: inbox.description,
            agency_id: inbox.agency_id,
            job_id: inbox.job_id,
            batch_id: inbox.batch_id,
            created_at: inbox.created_at,
        });
        return inbox;
    }

    async createApplicationInbox(input: ApplicationInboxInput) {
        const title = `New Application: ${input.candidateName}`;
        const description = `${input.candidateName} has applied for ${input.jobTitle}.`;

        const inbox = await this.prisma.inbox.create({
            data: {
                type: InboxType.application,
                status: InboxStatus.unread,
                severity: InboxSeverity.info,
                title,
                description,
                agency_id: input.agencyId,
                job_id: input.jobId,
                job_application_id: input.jobApplicationId,
            },
        });

        this.logger.log(`Created application inbox (applicationId=${input.jobApplicationId}, agencyId=${input.agencyId})`);

        await this.inboxEvents.emitInboxCreated(input.agencyId, {
            id: inbox.id,
            type: inbox.type,
            status: inbox.status,
            severity: inbox.severity,
            title: inbox.title,
            description: inbox.description,
            agency_id: inbox.agency_id,
            job_id: inbox.job_id,
            job_application_id: inbox.job_application_id,
            created_at: inbox.created_at,
        });

        return inbox;
    }

    async createInterviewInbox(input: InterviewInboxInput) {
        let title = "";
        let description = "";
        let severity = InboxSeverity.info;

        switch (input.status) {
            case InterviewSessionStatus.active:
                title = `Interview Started: ${input.candidateName}`;
                description = `${input.candidateName} has started the interview for ${input.jobTitle}.`;
                break;
            case InterviewSessionStatus.completed:
                title = `Interview Completed: ${input.candidateName}`;
                description = `${input.candidateName} has completed the interview for ${input.jobTitle}.`;
                severity = InboxSeverity.info;
                break;
            case InterviewSessionStatus.cancelled:
                title = `Interview Cancelled: ${input.candidateName}`;
                description = `${input.candidateName} has cancelled the interview for ${input.jobTitle}.`;
                severity = InboxSeverity.warning;
                break;
            case InterviewSessionStatus.postponed:
                title = `Interview Postponed: ${input.candidateName}`;
                description = `${input.candidateName} has postponed the interview for ${input.jobTitle}.`;
                severity = InboxSeverity.warning;
                break;
            default:
                return null;
        }

        const inbox = await this.prisma.inbox.create({
            data: {
                type: InboxType.interview,
                status: InboxStatus.unread,
                severity,
                title,
                description,
                agency_id: input.agencyId,
                job_id: input.jobId,
                interview_session_id: input.interviewSessionId,
            },
        });

        this.logger.log(`Created interview inbox (sessionId=${input.interviewSessionId}, status=${input.status}, agencyId=${input.agencyId})`);

        await this.inboxEvents.emitInboxCreated(input.agencyId, {
            id: inbox.id,
            type: inbox.type,
            status: inbox.status,
            severity: inbox.severity,
            title: inbox.title,
            description: inbox.description,
            agency_id: inbox.agency_id,
            job_id: inbox.job_id,
            interview_session_id: inbox.interview_session_id,
            created_at: inbox.created_at,
        });

        return inbox;
    }
}

