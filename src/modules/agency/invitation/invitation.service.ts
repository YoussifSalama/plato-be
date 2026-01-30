import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { MailGunService } from 'src/shared/services/mailgun.services';
import { RandomUuidServie } from 'src/shared/services/randomuuid.services';
import { CreateInvitationDto } from './dto/create-invitation.dto';

type InvitationEmailOptions = {
    recipientName?: string;
    agencyName?: string | null;
    invitationUrl: string;
    expiresAt: Date;
    isAuto?: boolean;
};

@Injectable()
export class InvitationService {
    private readonly logger = new Logger(InvitationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly randomUuidService: RandomUuidServie,
        private readonly mailGunService: MailGunService,
    ) { }

    private getFrontendBaseUrl() {
        const rawUrl = process.env.FRONTEND_URL ?? "";
        try {
            const url = new URL(rawUrl);
            return url.origin;
        } catch {
            return rawUrl.replace(/\/+$/, "");
        }
    }

    private buildInvitationEmail(options: InvitationEmailOptions) {
        const nameLine = options.recipientName ? `Hi ${options.recipientName},` : "Hello,";
        const agencyLine = options.agencyName
            ? `${options.agencyName} has invited you to continue your hiring process.`
            : "You have been invited to continue your hiring process.";
        const autoLine = options.isAuto
            ? "This invitation was sent automatically based on your profile."
            : undefined;
        const expiryLine = `This link expires on ${options.expiresAt.toUTCString()}.`;
        const subject = options.agencyName
            ? `Invitation from ${options.agencyName}`
            : "You're invited to Plato Hiring";
        const textParts = [
            nameLine,
            agencyLine,
            autoLine,
            `Open invitation: ${options.invitationUrl}`,
            expiryLine,
        ].filter(Boolean);
        const htmlParts = [
            `<p>${nameLine}</p>`,
            `<p>${agencyLine}</p>`,
            autoLine ? `<p>${autoLine}</p>` : "",
            `<p><a href="${options.invitationUrl}">Open invitation</a></p>`,
            `<p>${expiryLine}</p>`,
        ].filter(Boolean);
        return {
            subject,
            text: textParts.join("\n"),
            html: htmlParts.join(""),
        };
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

    async createInvitation(agencyId: number, resumeId: number) {
        const { token, expires_at } = this.randomUuidService.generateInvitationToken(2);
        return this.prisma.$transaction(async (tx) => {
            const resume = await tx.resume.findUnique({
                where: { id: resumeId },
                select: { id: true },
            });
            if (!resume) {
                throw new BadRequestException("Resume not found.");
            }

            const agency = await tx.agency.findUnique({
                where: { id: agencyId },
                select: { id: true, company_name: true },
            });
            if (!agency) {
                throw new BadRequestException("Agency not found.");
            }

            const existingInvitation = await tx.invitation.findUnique({
                where: { to_id: resumeId },
                select: { id: true, from_id: true },
            });

            let invitationId: number;
            if (existingInvitation) {
                if (existingInvitation.from_id !== agencyId) {
                    throw new BadRequestException("Resume already invited by another agency.");
                }
                invitationId = existingInvitation.id;
                await tx.invitationToken.updateMany({
                    data: { revoked: true },
                    where: {
                        invitation_id: invitationId,
                        revoked: false,
                    },
                });
            } else {
                const invitation = await tx.invitation.create({
                    data: {
                        to_id: resumeId,
                        from_id: agencyId,
                    },
                    select: { id: true },
                });
                invitationId = invitation.id;
            }

            const invitationToken = await tx.invitationToken.create({
                data: {
                    token,
                    expires_at,
                    invitation_id: invitationId,
                },
                select: { token: true, expires_at: true },
            });

            return {
                invitationId,
                agencyName: agency.company_name,
                token: invitationToken.token,
                expiresAt: invitationToken.expires_at,
            };
        });
    }

    async createInvitationFromEndpointForAccount(accountId: number, dto: CreateInvitationDto) {
        const agencyId = await this.getAgencyId(accountId);
        return this.createInvitationFromEndpoint(
            agencyId,
            dto.resume_id,
            dto.recipient_email,
            dto.recipient_name,
        );
    }

    async createInvitationFromEndpoint(
        agencyId: number,
        resumeId: number,
        recipientEmail: string,
        recipientName?: string,
    ) {
        try {
            if (!recipientEmail) {
                throw new BadRequestException("Recipient email is required.");
            }
            const invitation = await this.createInvitation(agencyId, resumeId);
            const invitationUrl = `${this.getFrontendBaseUrl()}/invitation?token=${invitation.token}`;
            const emailPayload = this.buildInvitationEmail({
                recipientName,
                agencyName: invitation.agencyName,
                invitationUrl,
                expiresAt: invitation.expiresAt,
            });
            await this.mailGunService.sendEmail(
                recipientEmail,
                emailPayload.subject,
                emailPayload.text,
                emailPayload.html,
            );
            return {
                ...invitation,
                recipientEmail,
            };
        } catch (error) {
            this.logger.error(
                `Failed to create invitation from endpoint (agencyId=${agencyId}, resumeId=${resumeId}, recipientEmail=${recipientEmail}).`,
                (error as Error)?.stack ?? String(error),
            );
            throw error;
        }
    }

    async createInvitationFromAuto(
        agencyId: number,
        resumeId: number,
        recipientEmail: string,
        recipientName?: string,
    ) {
        try {
            if (!recipientEmail) {
                throw new BadRequestException("Recipient email is required.");
            }
            const invitation = await this.createInvitation(agencyId, resumeId);
            const invitationUrl = `${this.getFrontendBaseUrl()}/invitation?token=${invitation.token}`;
            const emailPayload = this.buildInvitationEmail({
                recipientName,
                agencyName: invitation.agencyName,
                invitationUrl,
                expiresAt: invitation.expiresAt,
                isAuto: true,
            });
            await this.mailGunService.sendEmail(
                recipientEmail,
                emailPayload.subject,
                emailPayload.text,
                emailPayload.html,
            );
            return {
                ...invitation,
                recipientEmail,
                isAuto: true,
            };
        } catch (error) {
            this.logger.error(
                `Failed to create auto invitation (agencyId=${agencyId}, resumeId=${resumeId}, recipientEmail=${recipientEmail}).`,
                (error as Error)?.stack ?? String(error),
            );
            throw error;
        }
    }
}
