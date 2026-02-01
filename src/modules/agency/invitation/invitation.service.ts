import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { RandomUuidServie } from 'src/shared/services/randomuuid.services';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import invitationTemplate from 'src/shared/templates/invitation/Invitation.template';

@Injectable()
export class InvitationService {
    private readonly logger = new Logger(InvitationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly randomUuidService: RandomUuidServie,
        private readonly sendGridService: SendGridService,
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

    private async getRecipientFromResume(resumeId: number) {
        const resume = await this.prisma.resume.findUnique({
            where: { id: resumeId },
            select: {
                name: true,
                resume_structured: {
                    select: {
                        data: true,
                    },
                },
            },
        });
        if (!resume) {
            throw new BadRequestException("Resume not found.");
        }
        const structured = resume.resume_structured?.data as
            | {
                name?: string | null;
                email?: string | null;
                Email?: string | null;
                contact?: { email?: string | null; Email?: string | null } | null;
            }
            | null
            | undefined;
        const email =
            structured?.contact?.email ??
            structured?.contact?.Email ??
            structured?.email ??
            structured?.Email ??
            null;
        const name = structured?.name ?? resume.name ?? null;
        return { email, name };
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
        recipientEmail?: string,
        recipientName?: string,
    ) {
        try {
            let resolvedEmail = recipientEmail ?? null;
            let resolvedName = recipientName ?? null;
            if (!resolvedEmail || !resolvedName) {
                const recipient = await this.getRecipientFromResume(resumeId);
                resolvedEmail = resolvedEmail ?? recipient.email ?? null;
                resolvedName = resolvedName ?? recipient.name ?? null;
            }
            if (!resolvedEmail) {
                throw new BadRequestException("Recipient email is required.");
            }
            const emailSource = recipientEmail ? "request" : "resume_structured";
            this.logger.log(
                `Invitation recipient resolved (agencyId=${agencyId}, resumeId=${resumeId}, email=${resolvedEmail}, source=${emailSource}).`,
            );
            const invitation = await this.createInvitation(agencyId, resumeId);
            const frontendBaseUrl = this.getFrontendBaseUrl();
            const invitationUrl = `${frontendBaseUrl}/invitation?token=${invitation.token}`;
            const logoUrl = `${frontendBaseUrl}/brand/plato-logo.png`;
            const emailPayload = invitationTemplate({
                recipientName: resolvedName ?? undefined,
                agencyName: invitation.agencyName,
                invitationUrl,
                expiresAt: invitation.expiresAt,
                logoUrl,
            });
            const sendResult = await this.sendGridService.sendEmail(
                resolvedEmail,
                emailPayload.subject,
                emailPayload.text,
                emailPayload.html,
            );
            return {
                ...invitation,
                recipientEmail: resolvedEmail,
                emailStatus: sendResult ?? undefined,
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
            const frontendBaseUrl = this.getFrontendBaseUrl();
            const invitationUrl = `${frontendBaseUrl}/invitation?token=${invitation.token}`;
            const logoUrl = `${frontendBaseUrl}/brand/plato-logo.png`;
            const emailPayload = invitationTemplate({
                recipientName,
                agencyName: invitation.agencyName,
                invitationUrl,
                expiresAt: invitation.expiresAt,
                isAuto: true,
                logoUrl,
            });
            const sendResult = await this.sendGridService.sendEmail(
                recipientEmail,
                emailPayload.subject,
                emailPayload.text,
                emailPayload.html,
            );
            this.logger.log(
                `Auto invitation email send result (agencyId=${agencyId}, resumeId=${resumeId}, email=${recipientEmail}, status=${sendResult?.statusCode ?? "skipped"}).`,
            );
            return {
                ...invitation,
                recipientEmail,
                isAuto: true,
                emailStatus: sendResult ?? undefined,
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
