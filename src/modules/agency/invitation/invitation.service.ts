import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { Prisma } from "@generated/prisma";
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { CreateDirectInvitationDto } from './dto/create-direct-invitation.dto';
import invitationTemplate from 'src/shared/templates/invitation/Invitation.template';
import responseFormatter from 'src/shared/helpers/response';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvitationService {
    private readonly logger = new Logger(InvitationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly randomUuidService: RandomUuidService,
        private readonly sendGridService: SendGridService,
        private readonly configService: ConfigService
    ) { }

    private getFrontendBaseUrl() {
        const rawUrl = this.configService.get<string>('FRONTEND_URL_CANDIDATE') || '';
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
            select: { agency_id: true, teamMember: { select: { team: { select: { agency: { select: { id: true } } } } } } },
        });
        const agencyId = account?.teamMember?.team?.agency?.id ?? account?.agency_id;
        if (!agencyId) {
            throw new BadRequestException("Agency not found.");
        }
        return agencyId;
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

    private async getCandidateIdByEmail(email?: string | null) {
        if (!email) return null;
        const candidate = await this.prisma.candidate.findFirst({
            where: { email },
            select: { id: true },
        });
        return candidate?.id ?? null;
    }

    async createInvitation(agencyId: number, resumeId: number, candidateId?: number | null, accountId?: number) {
        const { token, expires_at } = this.randomUuidService.generateInvitationToken(2);
        return this.prisma.$transaction(async (tx) => {
            const resume = await tx.resume.findUnique({
                where: { id: resumeId },
                select: { id: true, job_id: true },
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
                        job_id: resume.job_id,
                        ...(accountId ? { updated_by: accountId } : {}),
                    } as Prisma.InvitationUncheckedCreateInput,
                    select: { id: true },
                });
                invitationId = invitation.id;
            }

            const invitationToken = await tx.invitationToken.create({
                data: {
                    token,
                    expires_at,
                    invitation_id: invitationId,
                    candidate_id: candidateId ?? undefined,
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
            accountId
        );
    }

    async createDirectInvitationForAccount(accountId: number, dto: CreateDirectInvitationDto) {
        const agencyId = await this.getAgencyId(accountId);
        return this.createDirectInvitation(agencyId, dto.candidate_id, dto.job_id);
    }

    async createDirectInvitation(agencyId: number, candidateId: number, jobId: number) {
        const application = await this.prisma.jobApplication.findUnique({
            where: {
                candidate_id_job_id: {
                    candidate_id: candidateId,
                    job_id: jobId,
                },
            },
            select: {
                resume_id: true,
                candidate: {
                    select: {
                        email: true,
                        f_name: true,
                        l_name: true
                    }
                }
            },
        });

        if (!application) {
            throw new BadRequestException("Candidate has not applied to this job.");
        }

        const candidateName = `${application.candidate.f_name} ${application.candidate.l_name}`.trim();

        // We can reuse the existing createInvitation logical flow.
        // However, we need to ensure the invitation email goes to the candidate's account email.
        // The existing createInvitationFromEndpoint extracts email from resume if not provided.
        // Since the resume is linked to the application, it should have the candidate's details.

        // Let's rely on createInvitationFromEndpoint but passing the resolved resume_id.
        return this.createInvitationFromEndpoint(
            agencyId,
            application.resume_id,
            application.candidate.email ?? undefined,
            candidateName,
            // Assuming direct invitation uses the same system or passes accountId if modified later
        );
    }

    async createInvitationFromEndpoint(
        agencyId: number,
        resumeId: number,
        recipientEmail?: string,
        recipientName?: string,
        accountId?: number
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
            const candidateId = await this.getCandidateIdByEmail(resolvedEmail);
            const invitation = await this.createInvitation(agencyId, resumeId, candidateId, accountId);
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
            const candidateId = await this.getCandidateIdByEmail(recipientEmail);
            const invitation = await this.createInvitation(agencyId, resumeId, candidateId);
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

    async validateInvitation(token: string) {
        const invitationToken = await this.prisma.invitationToken.findFirst({
            where: {
                token,
                revoked: false,
                expires_at: {
                    gt: new Date(),
                },
            },
            select: {
                candidate_id: true,
                invitation: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        if (!invitationToken) {
            throw new BadRequestException("Invalid invitation token.");
        }
        if (invitationToken.candidate_id) {
            return responseFormatter(
                {
                    status: "used",
                    candidate_id: invitationToken.candidate_id,
                },
                null,
                "Invitation token already linked to a candidate account.",
                409,
            );
        }
        return responseFormatter(
            { status: "valid" },
            null,
            "Invitation token is valid.",
            200,
        );
    }
}
