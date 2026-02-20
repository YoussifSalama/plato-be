import { Prisma } from '@generated/prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import TeamInvitationTemplate, { TeamInvitationEmailData } from 'src/shared/templates/agency/teamInvitation.template';
import { SendInvitationDto } from './dto/send-invitation.dto';

@Injectable()
export class TeamService {
    private invitationExpiryMinutes: number = 30;

    constructor(
        private readonly prisma: PrismaService,
        private readonly randomUuidService: RandomUuidService,
        private readonly sendGridService: SendGridService,
        private readonly configService: ConfigService
    ) { }

    private async generateUniqueRandomOrganizationId(): Promise<string> {
        const generateRandomId = () => 'org_' + Math.random().toString(36).substring(2, 10);
        let uniqueId = generateRandomId();
        while (await this.prisma.agency.findUnique({ where: { organization_id: uniqueId } })) {
            uniqueId = generateRandomId();
        }
        return uniqueId;
    }

    private async ensureAgencyHasOrganizationId(agencyId: number) {
        const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency) throw new BadRequestException('Agency not found.');

        if (!agency.organization_id) {
            const newOrgId = await this.generateUniqueRandomOrganizationId();
            await this.prisma.agency.update({
                where: { id: agencyId },
                data: { organization_id: newOrgId },
            });
            agency.organization_id = newOrgId;
        }

        return agency;
    }

    private async ensureThisEmailNotBelongsToAnotherAccount(email: string) {
        const accountWithEmail = await this.prisma.account.findFirst({ where: { email } });
        if (accountWithEmail) throw new BadRequestException('Email already belongs to another account.');
        return true;
    }

    async sendInvitation(dto: SendInvitationDto) {
        const { agencyId, email, memberName } = dto;

        const agency = await this.ensureAgencyHasOrganizationId(agencyId);

        await this.ensureThisEmailNotBelongsToAnotherAccount(email);

        const { token, expires_at } =
            this.randomUuidService.generateInvitationToken(this.invitationExpiryMinutes);

        try {
            const invitation = await this.prisma.$transaction(async (tx) => {
                // 1. Find or create the team member
                let teamMember = await tx.teamMember.findUnique({ where: { email } });
                if (!teamMember) {
                    teamMember = await tx.teamMember.create({
                        data: { email, name: memberName || '' },
                    });
                }

                // 2. Revoke all previous invitations from this agency to this email
                await tx.teamInvitation.updateMany({
                    where: { agency_id: agency.id, member_id: teamMember.id, revoked: false },
                    data: { revoked: true },
                });

                // 3. Create new invitation
                const newInvitation = await tx.teamInvitation.create({
                    data: {
                        code: token,
                        expires_at,
                        agency: { connect: { id: agency.id } },
                        member: { connect: { id: teamMember.id } },
                    },
                });

                // 4. Create team only if agency doesn't have one
                if (!agency.team_id) {
                    const team = await tx.team.create({ data: { agency: { connect: { id: agency.id } } } });
                    await tx.agency.update({
                        where: { id: agency.id },
                        data: { team_id: team.id },
                    });
                    if (!teamMember.team_id) {
                        await tx.teamMember.update({
                            where: { id: teamMember.id },
                            data: { team: { connect: { id: team.id } } },
                        });
                    }
                }

                return newInvitation;
            });

            const templateObj: TeamInvitationEmailData = {
                orgId: agency.organization_id as string,
                invitationCode: token,
                agencyName: agency.company_name || 'Agency',
                frontendBaseUrl: this.configService.get<string>('FRONTEND_BASE_URL') || '',
                expiresInMinutes: this.invitationExpiryMinutes,
            };

            await this.sendGridService.sendEmail(
                email,
                `You've been invited to join ${templateObj.agencyName}'s team on Plato Hiring`,
                undefined,
                TeamInvitationTemplate({ payload: templateObj }),
            );

            return { message: 'Invitation sent successfully.' };

        } catch (error) {
            console.error(error);
            throw new BadRequestException('Error generating invitation code.');
        }
    }

    async useInvitation(invitationCode: string) {
        const invitation = await this.prisma.teamInvitation.findUnique({
            where: { code: invitationCode },
            include: { agency: true, member: true },
        });

        if (!invitation) throw new BadRequestException('Invalid invitation code.');
        if (invitation.revoked) throw new BadRequestException('Invitation has been revoked.');
        if (invitation.expires_at < new Date()) throw new BadRequestException('Invitation expired.');

        let agency = invitation.agency;
        let team = await this.prisma.team.findUnique({ where: { id: agency.team_id ?? 0 } });

        if (!team) {
            team = await this.prisma.team.create({ data: { agency: { connect: { id: agency.id } } } });
            await this.prisma.agency.update({ where: { id: agency.id }, data: { team_id: team.id } });
        }

        if (invitation.member.team_id !== team.id) {
            await this.prisma.teamMember.update({ where: { id: invitation.member.id }, data: { team: { connect: { id: team.id } } } });
        }

        return team;
    }
}