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
        const { agencyId: accountId, email, memberName } = dto;

        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            include: { teamMember: true },
        });

        if (!account) throw new BadRequestException('Account not found.');
        if (account.teamMember) throw new BadRequestException('Only agency owners can invite team members.');
        if (!account.agency_id) throw new BadRequestException('You need an agency to invite team members.');

        const agency = await this.ensureAgencyHasOrganizationId(account.agency_id);

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
                }

                return newInvitation;
            });

            const frontendBaseUrl = this.configService.get<string>('env.frontendUrl') || '';
            const templateObj: TeamInvitationEmailData = {
                orgId: agency.organization_id as string,
                invitationCode: token,
                agencyName: agency.company_name || 'Agency',
                frontendBaseUrl,
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

    async useInvitation(org: string, code: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { organization_id: org },
            include: { team: { include: { members: true } } },
        });

        if (!agency) throw new BadRequestException('Invalid organization.');

        const invitation = await this.prisma.teamInvitation.findFirst({
            where: {
                code,
                agency_id: agency.id,
                revoked: false,
                expires_at: { gt: new Date() },
            },
            include: {
                member: { include: { account: true } },
            },
        });

        if (!invitation) throw new BadRequestException('Invalid or expired invitation code.');

        const alreadyOnTeam =
            agency.team &&
            agency.team.members.some((m) => m.id === invitation.member.id);

        if (alreadyOnTeam) throw new BadRequestException('Member is already part of this team.');

        return await this.prisma.$transaction(async (tx) => {
            let teamId = agency.team_id;

            if (!teamId) {
                const team = await tx.team.create({
                    data: { agency: { connect: { id: agency.id } } },
                });
                await tx.agency.update({
                    where: { id: agency.id },
                    data: { team_id: team.id },
                });
                teamId = team.id;
            }

            await tx.teamMember.update({
                where: { id: invitation.member.id },
                data: { team: { connect: { id: teamId } } },
            });

            await tx.teamInvitation.update({
                where: { id: invitation.id },
                data: { revoked: true },
            });

            return await tx.team.findUnique({
                where: { id: teamId },
                include: { members: { include: { account: true } }, agency: true },
            });
        });
    }

    async checkInvitation(org: string, code: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { organization_id: org },
            select: {
                id: true,
                company_name: true,
                organization_id: true,
                organization_url: true,
            },
        });

        if (!agency) throw new BadRequestException('Invalid organization.');

        const invitation = await this.prisma.teamInvitation.findFirst({
            where: {
                code,
                agency_id: agency.id,
                revoked: false,
                expires_at: { gt: new Date() },
            },
            select: {
                id: true,
                expires_at: true,
                member: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!invitation) throw new BadRequestException('Invalid or expired invitation code.');

        return {
            valid: true,
            agency: {
                name: agency.company_name,
                organization_id: agency.organization_id,
                organization_url: agency.organization_url,
            },
            member: {
                name: invitation.member.name,
                email: invitation.member.email,
            },
            expires_at: invitation.expires_at,
        };
    }

    async signupWithInvitation(org: string, code: string, dto: {
        f_name: string;
        l_name: string;
        user_name: string;
        password: string;
    }) {
        const agency = await this.prisma.agency.findUnique({
            where: { organization_id: org },
            include: { team: { include: { members: true } } },
        });

        if (!agency) throw new BadRequestException('Invalid organization.');

        const invitation = await this.prisma.teamInvitation.findFirst({
            where: {
                code,
                agency_id: agency.id,
                revoked: false,
                expires_at: { gt: new Date() },
            },
            include: { member: true },
        });

        if (!invitation) throw new BadRequestException('Invalid or expired invitation code.');

        const existingAccount = await this.prisma.account.findFirst({
            where: { email: invitation.member.email },
        });

        if (existingAccount) throw new BadRequestException('An account with this email already exists.');

        const existingUsername = await this.prisma.account.findFirst({
            where: { user_name: dto.user_name },
        });

        if (existingUsername) throw new BadRequestException('Username is already taken.');

        return await this.prisma.$transaction(async (tx) => {
            const bcrypt = await import('bcrypt');
            const password_hash = await bcrypt.hash(dto.password, 10);

            const credential = await tx.credential.create({
                data: { password_hash },
            });

            // إنشاء الفريق لو مش موجود
            let teamId = agency.team_id;
            if (!teamId) {
                const team = await tx.team.create({
                    data: { agency: { connect: { id: agency.id } } },
                });
                await tx.agency.update({
                    where: { id: agency.id },
                    data: { team_id: team.id },
                });
                teamId = team.id;
            }

            // ربط العضو بالـ team بعد إنشاء الحساب
            await tx.teamMember.update({
                where: { id: invitation.member.id },
                data: { team: { connect: { id: teamId } } },
            });

            const account = await tx.account.create({
                data: {
                    f_name: dto.f_name,
                    l_name: dto.l_name,
                    user_name: dto.user_name,
                    email: invitation.member.email,
                    verified: true,
                    credential: { connect: { id: credential.id } },
                    teamMember: { connect: { id: invitation.member.id } },
                },
            });

            await tx.teamInvitation.update({
                where: { id: invitation.id },
                data: { revoked: true },
            });

            return { message: 'Account created successfully. You can now sign in.' };
        });
    }
}