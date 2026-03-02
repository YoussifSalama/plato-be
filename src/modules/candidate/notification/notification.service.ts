import { Injectable, Logger } from "@nestjs/common";
import { CandidateNotificationGateway } from "./notification.gateway";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { CandidateInboxType, CandidateInboxStatus } from "@generated/prisma";
import responseFormatter from "src/shared/helpers/response";

@Injectable()
export class CandidateNotificationService {
    private readonly logger = new Logger(CandidateNotificationService.name);

    constructor(
        private readonly gateway: CandidateNotificationGateway,
        private readonly prisma: PrismaService
    ) { }

    async emitApplicationUpdate(candidateId: number, payload: Record<string, unknown>) {
        this.logger.log(`Emitting application update for candidate ${candidateId}`);
        // Save to DB
        await this.prisma.candidateInbox.create({
            data: {
                candidate_id: candidateId,
                type: 'application',
                title: payload.jobTitle ? `Application Submitted: ${payload.jobTitle}` : 'Application Update',
                description: 'Your job application has been updated.',
                job_id: payload.jobId as number || null,
            }
        });
        this.gateway.emitToCandidate(candidateId, "notification.application", payload);
    }

    async emitInterviewUpdate(candidateId: number, payload: Record<string, unknown>) {
        this.logger.log(`Emitting interview update for candidate ${candidateId}`);
        // Save to DB
        await this.prisma.candidateInbox.create({
            data: {
                candidate_id: candidateId,
                type: 'interview',
                title: payload.jobTitle ? `Interview Update: ${payload.jobTitle}` : 'Interview Update',
                description: `Status changed to ${payload.status}`,
                interview_session_id: payload.interviewSessionId as number || null,
            }
        });
        this.gateway.emitToCandidate(candidateId, "notification.interview", payload);
    }

    async emitAccountUpdate(candidateId: number, payload: Record<string, unknown>) {
        this.logger.log(`Emitting account update for candidate ${candidateId}`);
        // Save to DB
        await this.prisma.candidateInbox.create({
            data: {
                candidate_id: candidateId,
                type: 'account',
                title: payload.type === 'PASSWORD_CHANGED' ? 'Password Changed' : `Profile Updated: ${payload.section || 'General'}`,
                description: 'Your account settings have been updated.',
            }
        });
        this.gateway.emitToCandidate(candidateId, "notification.account", payload);
    }

    async listInbox(candidateId: number, page: number = 1, limit: number = 10, status?: string, type?: string, sort_by: string = 'created_at', sort_order: string = 'desc') {
        const offset = (page - 1) * limit;

        const where: any = { candidate_id: candidateId };
        if (status) {
            where.status = status as CandidateInboxStatus;
        }
        if (type) {
            where.type = type as CandidateInboxType;
        }

        const orderBy: any = {};
        if (sort_by) {
            orderBy[sort_by] = sort_order === 'asc' ? 'asc' : 'desc';
        } else {
            orderBy.created_at = 'desc';
        }

        const [total, currentUnread, items] = await Promise.all([
            this.prisma.candidateInbox.count({ where }),
            this.prisma.candidateInbox.count({ where: { candidate_id: candidateId, status: 'unread' } }),
            this.prisma.candidateInbox.findMany({
                where,
                orderBy,
                skip: offset,
                take: limit,
            })
        ]);

        const meta = {
            total_items: total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
            has_more: page * limit < total,
            unread_count: currentUnread
        };

        return responseFormatter(items, meta, "Inbox listed successfully.", 200);
    }

    async markAsRead(candidateId: number, inboxId: number) {
        await this.prisma.candidateInbox.updateMany({
            where: { id: inboxId, candidate_id: candidateId },
            data: { status: 'read' }
        });
        return responseFormatter({ success: true }, undefined, "Notification marked as read.", 200);
    }

    async markAllAsRead(candidateId: number) {
        await this.prisma.candidateInbox.updateMany({
            where: { candidate_id: candidateId, status: 'unread' },
            data: { status: 'read' }
        });
        return responseFormatter({ success: true }, undefined, "All notifications marked as read.", 200);
    }

    async archiveInbox(candidateId: number, inboxId: number) {
        await this.prisma.candidateInbox.updateMany({
            where: { id: inboxId, candidate_id: candidateId },
            data: { status: 'archived' }
        });
        return responseFormatter({ success: true }, undefined, "Notification archived.", 200);
    }
}
