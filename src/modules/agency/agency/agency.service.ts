import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { OtpPurpose } from 'src/generated/prisma/client';
import { BcryptService } from 'src/shared/services/bcrypt.services';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { JwtService } from 'src/shared/services/jwt.services';
import signupTemplate from 'src/shared/templates/agency/Signup.template';
import resendVerificationTemplate from 'src/shared/templates/agency/ResendVerification.template';
import resetPasswordOtpTemplate from 'src/shared/templates/agency/ResetPasswordOtp.template';
import responseFormatter from 'src/shared/helpers/response';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { IJwtProvider } from 'src/shared/types/services/jwt.types';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from 'src/shared/services/google-auth.service';

@Injectable()
export class AgencyService {
    private readonly logger = new Logger(AgencyService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly bcryptService: BcryptService,
        private readonly sendGridService: SendGridService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly googleAuthService: GoogleAuthService,
    ) { }

    private getFrontendBaseUrl() {
        const rawUrl = this.configService.get<string>('FRONTEND_URL') || '';
        try {
            const url = new URL(rawUrl);
            return url.origin;
        } catch {
            return rawUrl.replace(/\/+$/, "");
        }
    }

    async signup(signupDto: SignupDto) {
        const { f_name, l_name, email, user_name, password } = signupDto;
        const { account, verifyToken } = await this.prisma.$transaction(async (tx) => {
            const existingUser = await tx.account.findFirst({
                where: {
                    OR: [
                        { email },
                        { user_name },
                    ],
                }
            })
            if (existingUser) {
                throw new BadRequestException("Account already exists.");
            }
            const passwordHash = await this.bcryptService.bcryptHash(password, "password");
            const credential = await tx.credential.create({
                data: {
                    password_hash: passwordHash,
                }
            })
            const account = await tx.account.create({
                data: {
                    email,
                    user_name,
                    f_name,
                    l_name,
                    credential_id: credential.id,
                },
                select: {
                    id: true,
                    email: true,
                    f_name: true,
                    l_name: true,
                    user_name: true,
                    created_at: true,
                    updated_at: true,
                },
            })
            if (!account) {
                throw new BadRequestException("Unable to create account.");
            }
            const verifyToken = randomUUID();
            const verifyAccountTokenClient = (tx as unknown as {
                verifyAccountToken: { create: (args: { data: { token: string; expires_at: Date; used_at?: Date | null; account_id: number } }) => Promise<unknown> }
            }).verifyAccountToken;
            await verifyAccountTokenClient.create({
                data: {
                    token: verifyToken,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    account_id: account.id,
                }
            })
            return { account, verifyToken };
        })
        const displayName = `${f_name} ${l_name}`.trim();
        const verifyEmailUrl = `${this.getFrontendBaseUrl()}/auth/verify?token=${verifyToken}`;
        await this.sendGridService.sendEmail(
            email,
            "Welcome to Plato Hiring",
            undefined,
            signupTemplate(displayName, verifyEmailUrl),
        );
        return responseFormatter(account, undefined, "Account created successfully, please check your email for verification.", 201);
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        const account = await this.prisma.account.findFirst({
            where: { email },
            include: { credential: true },
        });
        if (!account || !account.credential) {
            throw new BadRequestException("Wrong credentials.");
        }
        if (!(account as { verified?: boolean }).verified) {
            throw new BadRequestException("Account not verified. Please verify your email.");
        }
        const isValid = await this.bcryptService.bcryptCompare(password, account.credential.password_hash, "password");
        if (!isValid) {
            throw new BadRequestException("Wrong credentials.");
        }

        if (!account) {
            throw new BadRequestException("Account not found.");
        }
        const safeAccountId = account.id;
        const tokenPayload = {
            id: safeAccountId,
            provider: IJwtProvider.agency,
        };
        const access_token = await this.jwtService.generateAccessToken(tokenPayload);
        const refresh = await this.jwtService.generateRefreshToken(tokenPayload);

        const tokenClient = (this.prisma as unknown as {
            token: { create: (args: { data: { refresh_token: string; account_id: number } }) => Promise<unknown> }
        }).token;
        await tokenClient.create({
            data: {
                refresh_token: refresh.refresh_token,
                account_id: safeAccountId,
            }
        });

        return responseFormatter(
            {
                access_token,
                refresh_token: refresh.refresh_token,
                refresh_expires_at: refresh.expires_at,
            },
            undefined,
            "Login successful.",
            200
        );
    }

    async loginWithGoogle(idToken: string) {
        const profile = await this.googleAuthService.verifyAgencyIdToken(idToken);
        const email = profile.email.toLowerCase();

        // Try match by google_id first
        const accountWithRelations = await this.prisma.account.findFirst({
            where: {
                OR: [
                    // Narrow casts to allow newly added fields before regenerating Prisma client
                    { google_id: profile.sub } as any,
                    { email },
                ],
            } as any,
            include: { teamMember: true, agency: true } as any,
        });

        let account = accountWithRelations as (typeof accountWithRelations & { teamMember?: unknown }) | null;
        const isOwner = account && !(account as any).teamMember && Boolean(account.agency_id);

        if (account && !isOwner) {
            throw new BadRequestException(
                "Google sign-in is only available for agency owners. Team members must use email and password.",
            );
        }

        if (!account) {
            // Create new owner account + empty agency shell
            const passwordHash = await this.bcryptService.bcryptHash(
                randomUUID().replace(/-/g, '').slice(0, 16),
                'password',
            );

            const created = await this.prisma.$transaction(async (tx) => {
                const credential = await tx.credential.create({
                    data: { password_hash: passwordHash },
                    select: { id: true },
                });

                const newAccount = await tx.account.create({
                    data: {
                        email,
                        f_name: profile.givenName || 'Owner',
                        l_name: profile.familyName || 'User',
                        user_name: email.split('@')[0],
                        verified: true,
                        credential_id: credential.id,
                        google_id: profile.sub,
                        auth_provider: 'google',
                        profile_image_url: profile.picture ?? null,
                    } as any,
                });

                const agency = await tx.agency.create({
                    data: {},
                    select: { id: true },
                });

                await tx.account.update({
                    where: { id: newAccount.id },
                    data: { agency_id: agency.id },
                });

                return { ...newAccount, agency_id: agency.id };
            });

            account = created as any;
        } else {
            // Ensure google_id / provider are linked
            await this.prisma.account.update({
                where: { id: account.id },
                data: {
                    google_id: (account as any).google_id ?? profile.sub,
                    auth_provider: (account as any).auth_provider ?? 'google',
                    profile_image_url: (account as any).profile_image_url ?? profile.picture ?? null,
                    verified: true,
                } as any,
            });
        }

        if (!account) {
            throw new BadRequestException("Account not found.");
        }

        const tokenPayload = {
            id: account.id,
            provider: IJwtProvider.agency,
        };
        const access_token = await this.jwtService.generateAccessToken(tokenPayload);
        const refresh = await this.jwtService.generateRefreshToken(tokenPayload);

        const tokenClient = (this.prisma as unknown as {
            token: { create: (args: { data: { refresh_token: string; account_id: number } }) => Promise<unknown> }
        }).token;
        await tokenClient.create({
            data: {
                refresh_token: refresh.refresh_token,
                account_id: account.id,
            }
        });

        return responseFormatter(
            {
                access_token,
                refresh_token: refresh.refresh_token,
                refresh_expires_at: refresh.expires_at,
            },
            undefined,
            "Login successful.",
            200,
        );
    }

    async getMyAgencyAccountData(accountId: number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: {
                email: true,
                f_name: true,
                l_name: true,
                user_name: true,
                agency_id: true,
                teamMember: true,
            },
        });

        if (!account) {
            throw new BadRequestException("Account not found.");
        }

        const name = `${account.f_name} ${account.l_name}`.trim();
        const agency_id = account.agency_id ?? null;

        // Check if the account has a team member relation
        const is_member = !!account.teamMember;

        return responseFormatter(
            {
                f_name: account.f_name ?? "",
                l_name: account.l_name ?? "",
                user_name: account.user_name ?? "",
                name,
                email: account.email,
                agency_id,
                is_member,
            },
            undefined,
            "Account data retrieved.",
            200
        );
    }

    async refreshAccessToken(refreshToken: string) {
        const tokenRecord = await this.prisma.token.findFirst({
            where: { refresh_token: refreshToken },
        });
        if (!tokenRecord) {
            throw new BadRequestException("Invalid refresh token.");
        }
        let payload: { id: number; provider: IJwtProvider };
        try {
            payload = await this.jwtService.verifyRefreshToken(refreshToken);
        } catch {
            throw new BadRequestException("Invalid refresh token.");
        }
        if (payload.provider !== IJwtProvider.agency || payload.id !== tokenRecord.account_id) {
            throw new BadRequestException("Invalid refresh token.");
        }
        const access_token = await this.jwtService.generateAccessToken({
            id: payload.id,
            provider: payload.provider,
        });
        return responseFormatter({ access_token }, undefined, "Token refreshed.", 200);
    }

    async logout(refreshToken: string) {
        if (!refreshToken) {
            throw new BadRequestException("Refresh token is required.");
        }
        await this.prisma.token.deleteMany({
            where: { refresh_token: refreshToken },
        });
        return responseFormatter({ success: true }, undefined, "Logged out successfully.", 200);
    }

    async verifyAccountToken(token: string) {
        const verifyAccountTokenClient = (this.prisma as unknown as {
            verifyAccountToken: {
                findFirst: (args: { where: { token: string }; include: { account: true } }) => Promise<{ id: number; token: string; expires_at: Date; used_at: Date | null; account: { id: number; email: string; f_name: string; l_name: string } }>
                update: (args: { where: { id: number }; data: { used_at: Date } }) => Promise<unknown>
            }
        }).verifyAccountToken;

        const record = await verifyAccountTokenClient.findFirst({
            where: { token },
            include: { account: true },
        });
        if (!record) {
            return { valid: false };
        }
        const isExpired = record.expires_at.getTime() <= Date.now();
        const isUsed = Boolean(record.used_at);
        if (isExpired || isUsed) {
            return { valid: false, email: record.account.email, accountName: `${record.account.f_name} ${record.account.l_name}`.trim() };
        }

        await verifyAccountTokenClient.update({
            where: { id: record.id },
            data: { used_at: new Date() },
        });
        const accountClient = (this.prisma as unknown as {
            account: { update: (args: { where: { id: number }; data: { verified: boolean } }) => Promise<unknown> }
        }).account;
        await accountClient.update({
            where: { id: record.account.id },
            data: { verified: true },
        });
        return { valid: true };
    }

    async resendVerificationToken(token: string) {
        const verifyAccountTokenClient = (this.prisma as unknown as {
            verifyAccountToken: {
                findFirst: (args: { where: { token: string }; include: { account: true } }) => Promise<{ id: number; token: string; expires_at: Date; used_at: Date | null; account: { id: number; email: string; f_name: string; l_name: string } }>
                update: (args: { where: { id: number }; data: { used_at: Date } }) => Promise<unknown>
                create: (args: { data: { token: string; expires_at: Date; account_id: number } }) => Promise<unknown>
            }
        }).verifyAccountToken;

        const record = await verifyAccountTokenClient.findFirst({
            where: { token },
            include: { account: true },
        });
        if (!record) {
            throw new BadRequestException("Token not found.");
        }
        if (!record.used_at) {
            await verifyAccountTokenClient.update({
                where: { id: record.id },
                data: { used_at: new Date() },
            });
        }
        const newToken = randomUUID();
        await verifyAccountTokenClient.create({
            data: {
                token: newToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                account_id: record.account.id,
            }
        });

        const displayName = `${record.account.f_name} ${record.account.l_name}`.trim();
        const verifyEmailUrl = `${this.getFrontendBaseUrl()}/auth/verify?token=${newToken}`;
        await this.sendGridService.sendEmail(
            record.account.email,
            "Verify your Plato Hiring account",
            undefined,
            resendVerificationTemplate(displayName, verifyEmailUrl),
        );
        return responseFormatter({ success: true }, undefined, "Verification email sent.", 200);
    }

    async updateBrand(accountId: number, updateAccountDto: UpdateAccountDto) {
        const { user_name, f_name, l_name } = updateAccountDto;
        if (!user_name && !f_name && !l_name) {
            throw new BadRequestException("No fields to update.");
        }
        if (user_name) {
            const existing = await this.prisma.account.findFirst({
                where: {
                    AND: [
                        { id: { not: accountId } },
                        {
                            OR: [
                                ...(user_name ? [{ user_name }] : []),
                            ],
                        },
                    ],
                },
            });
            if (existing) {
                throw new BadRequestException("Username already in use.");
            }
        }
        const account = await this.prisma.account.update({
            where: { id: accountId },
            data: {
                ...(user_name ? { user_name } : {}),
                ...(f_name ? { f_name } : {}),
                ...(l_name ? { l_name } : {}),
            },
            select: {
                id: true,
                email: true,
                f_name: true,
                l_name: true,
                user_name: true,
                updated_at: true,
            },
        });
        return responseFormatter(account, undefined, "Account updated successfully.", 200);
    }

    async updateAgency(accountId: number, updateAgencyDto: UpdateAgencyDto) {
        const {
            company_name,
            organization_url,
            company_size,
            company_industry,
            company_description,
        } = updateAgencyDto;
        if (!company_name && !organization_url && !company_size && !company_industry && !company_description) {
            throw new BadRequestException("No fields to update.");
        }
        const agency = await this.prisma.$transaction(async (tx) => {
            const account = await tx.account.findUnique({
                where: { id: accountId },
                select: { id: true, agency_id: true },
            });
            if (!account) {
                throw new BadRequestException("Account not found.");
            }
            let agencyId = account.agency_id;
            if (!agencyId) {
                const agency = await tx.agency.create({
                    data: {},
                    select: { id: true },
                });
                agencyId = agency.id;
                await tx.account.update({
                    where: { id: accountId },
                    data: { agency_id: agencyId },
                });
            }
            return tx.agency.update({
                where: { id: agencyId },
                data: {
                    ...(company_name ? { company_name } : {}),
                    ...(organization_url ? { organization_url } : {}),
                    ...(company_size ? { company_size } : {}),
                    ...(company_industry ? { company_industry } : {}),
                    ...(company_description ? { company_description } : {}),
                },
            });
        });
        return responseFormatter(agency, undefined, "Agency updated successfully.", 200);
    }


    async getAgencyOverview(accountId: number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            include: {
                agency: true,
                teamMember: {
                    include: {
                        team: {
                            include: {
                                agency: true,
                            },
                        },
                    },
                },
            },
        });

        if (!account) {
            throw new BadRequestException("Account not found.");
        }

        const isATeamMember = Boolean(account.teamMember);
        const agency = isATeamMember ? account.teamMember?.team?.agency : account.agency;

        const isComplete = Boolean(
            agency?.company_name &&
            agency?.organization_url &&
            agency?.company_size &&
            agency?.company_industry
        );

        return responseFormatter(
            {
                isATeamMember,
                isComplete,
                agency: agency
                    ? {
                        company_name: agency.company_name,
                        organization_url: agency.organization_url,
                        company_size: agency.company_size,
                        company_industry: agency.company_industry,
                        company_description: agency.company_description,
                    }
                    : null,
            },
            undefined,
            "Overview loaded.",
            200
        );
    }

    async getAgencyStatus(accountId: number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            include: { agency: true, teamMember: { include: { team: { include: { agency: true } } } } },
        });
        if (!account) {
            throw new BadRequestException("Account not found.");
        }

        let agencyId = account.agency_id ?? account.agency?.id ?? null;
        let isComplete = false;
        let hasAgency = false;

        if (account.teamMember) {
            agencyId = account.teamMember.team?.agency?.id ?? null;
            hasAgency = Boolean(agencyId);
            isComplete = true; // Team members don't need to complete the agency profile themselves usually, or we assume it's complete to allow them access.
        } else {
            const agency = account.agency;
            agencyId = account.agency_id ?? agency?.id ?? null;
            hasAgency = Boolean(agencyId);
            isComplete = Boolean(
                agency?.company_name &&
                agency?.organization_url &&
                agency?.company_size &&
                agency?.company_industry
            );
        }

        return responseFormatter(
            { agencyId, hasAgency, isComplete },
            undefined,
            "Agency status loaded.",
            200
        );
    }

    async getAgencyDashboard(accountId: number) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            select: { agency_id: true, teamMember: { select: { team: { select: { agency: { select: { id: true } } } } } } },
        });

        const agencyId = account?.teamMember?.team?.agency?.id ?? (account?.agency_id ?? null);

        if (!agencyId) {
            throw new BadRequestException("Agency not found.");
        }

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(now.getDate() - 60);

        const currentDay = now.getDay() || 7;
        const currentWeekMonday = new Date(now);
        currentWeekMonday.setDate(now.getDate() - currentDay + 1);
        currentWeekMonday.setHours(0, 0, 0, 0);

        const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        // Execute all queries concurrently
        const [
            activeJobsCount,
            totalCandidatesCount,
            upcomingInterviewsCount,
            unreadMessagesCount,

            // Overview: Current 30 Days
            currentJobsCount,
            currentApplicantsCount,
            currentInterviewsCount,
            currentResumesCount,
            currentShortlistedCount,

            // Overview: Previous 30 Days
            prevJobsCount,
            prevApplicantsCount,
            prevInterviewsCount,
            prevResumesCount,
            prevShortlistedCount,

            // Weekly Activity base queries
            weeklyApplications,
            weeklyInterviews,

            // Application Status (Interview Session Statuses)
            interviewStatusDist,

            // Department / Jobs
            allAgencyJobs,

            // Monthly growth
            sixMonthsApplications,

            // Recent Activity basis
            recentApplications,
            recentInterviews,
            recentInboxes,
        ] = await Promise.all([
            // 1. Top Metrics
            this.prisma.job.count({
                where: {
                    agency_id: agencyId,
                    is_active: true,
                    auto_deactivate_at: { gt: now },
                },
            }),
            this.prisma.resume.count({ where: { job: { agency_id: agencyId } } }),
            this.prisma.interviewSession.count({ where: { agency_id: agencyId, status: 'active' } }),
            this.prisma.inbox.count({ where: { agency_id: agencyId, status: 'unread' } }),

            // 2. Overview Current 30 days
            this.prisma.job.count({ where: { agency_id: agencyId, created_at: { gte: thirtyDaysAgo } } }),
            this.prisma.jobApplication.count({ where: { job: { agency_id: agencyId }, created_at: { gte: thirtyDaysAgo } } }),
            this.prisma.interviewSession.count({ where: { agency_id: agencyId, created_at: { gte: thirtyDaysAgo } } }),
            this.prisma.resume.count({ where: { job: { agency_id: agencyId }, created_at: { gte: thirtyDaysAgo } } }),
            this.prisma.resume.count({ where: { job: { agency_id: agencyId }, auto_shortlisted: true, created_at: { gte: thirtyDaysAgo } } }),

            // Overview Previous 30 days
            this.prisma.job.count({ where: { agency_id: agencyId, created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
            this.prisma.jobApplication.count({ where: { job: { agency_id: agencyId }, created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
            this.prisma.interviewSession.count({ where: { agency_id: agencyId, created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
            this.prisma.resume.count({ where: { job: { agency_id: agencyId }, created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
            this.prisma.resume.count({ where: { job: { agency_id: agencyId }, auto_shortlisted: true, created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),

            // 3. Weekly Activity
            this.prisma.jobApplication.findMany({
                where: { job: { agency_id: agencyId }, created_at: { gte: currentWeekMonday } },
                select: { created_at: true },
            }),
            this.prisma.interviewSession.findMany({
                where: { agency_id: agencyId, created_at: { gte: currentWeekMonday } },
                select: { created_at: true },
            }),

            // 4. Interview Distribution
            this.prisma.interviewSession.groupBy({
                by: ['status'],
                where: { agency_id: agencyId },
                _count: { id: true },
            }),

            // 5. Department Hiring Progress (Jobs with metrics)
            this.prisma.job.findMany({
                where: { agency_id: agencyId },
                select: {
                    industry: true,
                    is_active: true,
                    auto_deactivate_at: true,
                    _count: {
                        select: { resumes: { where: { auto_shortlisted: true } } }
                    }
                }
            }),

            // 6. Monthly Growth Last 6 months
            this.prisma.jobApplication.findMany({
                where: { job: { agency_id: agencyId }, created_at: { gte: sixMonthsAgoStart } },
                select: { created_at: true },
            }),

            // 7. Recent Activities
            this.prisma.jobApplication.findMany({
                where: { job: { agency_id: agencyId } },
                orderBy: { created_at: 'desc' },
                take: 10,
                include: { candidate: true, job: true },
            }),
            this.prisma.interviewSession.findMany({
                where: { agency_id: agencyId },
                orderBy: { created_at: 'desc' },
                take: 10,
                include: { invitation_token: { include: { invitation: { include: { job: true, to: true } } } } },
            }),
            this.prisma.inbox.findMany({
                where: { agency_id: agencyId },
                orderBy: { created_at: 'desc' },
                take: 10,
            }),
        ]);

        const calcTrend = (current: number, prev: number) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return ((current - prev) / prev) * 100;
        };

        const currentHiringSuccessRate = currentResumesCount > 0 ? (currentShortlistedCount / currentResumesCount) * 100 : 0;
        const prevHiringSuccessRate = prevResumesCount > 0 ? (prevShortlistedCount / prevResumesCount) * 100 : 0;

        // Weekly Activity Build
        const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const weeklyActivity = daysOfWeek.map(day => ({ day, applications: 0, interviews: 0 }));

        const getDayIndex = (d: Date) => (d.getDay() || 7) - 1; // 0 for Mon, 6 for Sun

        weeklyApplications.forEach(app => {
            const idx = getDayIndex(app.created_at);
            if (weeklyActivity[idx]) weeklyActivity[idx].applications++;
        });
        weeklyInterviews.forEach(int => {
            const idx = getDayIndex(int.created_at);
            if (weeklyActivity[idx]) weeklyActivity[idx].interviews++;
        });

        // Application Status Build -> Interview Status Map
        const applicationStatus = interviewStatusDist.map(st => ({
            stage: st.status.charAt(0).toUpperCase() + st.status.slice(1),
            value: st._count.id,
        }));

        // Department Progress Build
        const deptMap = new Map<string, { currentHired: number, targetHires: number }>();
        allAgencyJobs.forEach(job => {
            const ind = job.industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            if (!deptMap.has(ind)) deptMap.set(ind, { currentHired: 0, targetHires: 0 });
            const entry = deptMap.get(ind)!;
            if (job.is_active && job.auto_deactivate_at > now) entry.targetHires += 1; // 1 effectively active job = 1 target hire proxy
            entry.currentHired += job._count.resumes;
        });
        const departmentProgress = Array.from(deptMap.entries()).map(([department, data]) => ({
            department,
            currentHired: data.currentHired,
            targetHires: data.targetHires || 1, // ensure targetHires is at least 1 or fallback
        }));

        // Monthly Growth Build
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyGrowthChart: Record<string, number> = {};
        for (let i = 0; i < 6; i++) {
            const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
            const key = `${monthNames[m.getMonth()]} ${m.getFullYear().toString().substring(2)}`;
            monthlyGrowthChart[key] = 0;
        }

        sixMonthsApplications.forEach(app => {
            const key = `${monthNames[app.created_at.getMonth()]} ${app.created_at.getFullYear().toString().substring(2)}`;
            if (monthlyGrowthChart[key] !== undefined) {
                monthlyGrowthChart[key]++;
            }
        });

        const chartData = Object.entries(monthlyGrowthChart).map(([month, applications]) => ({ month, applications }));
        const currentMonthTotal = chartData[chartData.length - 1]?.applications || 0;
        const prevMonthTotal = chartData[chartData.length - 2]?.applications || 0;

        // Recent Activities Build
        const activities: Array<{ id: string, type: 'application' | 'interview' | 'message' | 'job' | 'offer', title: string, description?: string, timestamp: Date }> = [];

        recentApplications.forEach(app => {
            activities.push({
                id: `app-${app.id}`,
                type: 'application',
                title: `New application for ${app.job?.title || 'Job'}`,
                description: app.candidate ? `${app.candidate.f_name} ${app.candidate.l_name} applied.` : undefined,
                timestamp: app.created_at,
            });
        });

        recentInterviews.forEach(int => {
            const inv = int.invitation_token?.invitation;
            activities.push({
                id: `int-${int.id}`,
                type: 'interview',
                title: `Interview Session Created`,
                description: inv ? `Session for ${inv.to?.name} (${inv.job?.title})` : 'A new interview session was initiated.',
                timestamp: int.created_at,
            });
        });

        recentInboxes.forEach(inbox => {
            let type: 'message' | 'application' | 'interview' = 'message';
            if (inbox.type === 'application') type = 'application';
            if (inbox.type === 'interview') type = 'interview';
            activities.push({
                id: `msg-${inbox.id}`,
                type,
                title: inbox.title,
                description: inbox.description || undefined,
                timestamp: inbox.created_at,
            });
        });

        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const recentActivities = activities.slice(0, 10).map(a => ({
            ...a,
            timestamp: a.timestamp.toISOString()
        }));

        const responseData = {
            metrics: {
                activeJobs: activeJobsCount,
                totalCandidates: totalCandidatesCount,
                upcomingInterviews: upcomingInterviewsCount,
                unreadMessages: unreadMessagesCount,
            },
            overview: {
                totalJobs: { value: currentJobsCount, trend: calcTrend(currentJobsCount, prevJobsCount) },
                newApplicants: { value: currentApplicantsCount, trend: calcTrend(currentApplicantsCount, prevApplicantsCount) },
                interviewsScheduled: { value: currentInterviewsCount, trend: calcTrend(currentInterviewsCount, prevInterviewsCount) },
                hiringSuccessRate: { value: currentHiringSuccessRate, trend: Math.round(currentHiringSuccessRate - prevHiringSuccessRate) },
            },
            weeklyActivity,
            applicationStatus,
            departmentProgress,
            monthlyGrowth: {
                chartData,
                currentMonth: {
                    total: currentMonthTotal,
                    trend: calcTrend(currentMonthTotal, prevMonthTotal),
                },
            },
            recentActivities,
        };

        return responseFormatter(
            responseData,
            undefined,
            "Agency dashboard loaded.",
            200
        );
    }

    async changePassword(accountId: number, changePasswordDto: ChangePasswordDto) {
        const { oldPassword, newPassword } = changePasswordDto;
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            include: { credential: true },
        });
        if (!account || !account.credential) {
            throw new BadRequestException("Account not found.");
        }
        const isValid = await this.bcryptService.bcryptCompare(oldPassword, account.credential.password_hash, "password");
        if (!isValid) {
            throw new BadRequestException("Invalid current password.");
        }
        if (oldPassword === newPassword) {
            throw new BadRequestException("New password must be different.");
        }
        const newHash = await this.bcryptService.bcryptHash(newPassword, "password");
        await this.prisma.credential.update({
            where: { id: account.credential.id },
            data: { password_hash: newHash },
        });
        return responseFormatter({ success: true }, undefined, "Password updated successfully.", 200);
    }

    async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
        const { email } = requestPasswordResetDto;
        const account = await this.prisma.account.findUnique({
            where: { email },
        });
        if (!account) {
            return responseFormatter({ success: true }, undefined, "Reset OTP sent.", 200);
        }
        const otpCode = this.generateOtpCode();
        if (process.env.NODE_ENV !== "production") {
            this.logger.warn(`Password reset OTP for ${email}: ${otpCode}`);
        }
        const hashedCode = await this.bcryptService.bcryptHash(otpCode, "otp");
        await this.prisma.otp.updateMany({
            where: {
                account_id: account.id,
                purpose: OtpPurpose.reset,
                used_at: null,
            },
            data: { used_at: new Date() },
        });
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.otp.create({
            data: {
                code: hashedCode,
                purpose: OtpPurpose.reset,
                expires_at: expiresAt,
                account_id: account.id,
            },
        });
        const displayName = `${account.f_name} ${account.l_name}`.trim();
        await this.sendGridService.sendEmail(
            account.email,
            "Reset your Plato Hiring password",
            undefined,
            resetPasswordOtpTemplate(displayName, otpCode)
        );
        return responseFormatter({ success: true }, undefined, "Reset OTP sent.", 200);
    }

    async verifyPasswordResetOtp(verifyPasswordResetOtpDto: VerifyPasswordResetOtpDto) {
        const { email, otp } = verifyPasswordResetOtpDto;
        const account = await this.prisma.account.findUnique({
            where: { email },
        });
        if (!account) {
            return responseFormatter({ valid: false }, undefined, "OTP invalid.", 200);
        }
        const otpRecord = await this.prisma.otp.findFirst({
            where: {
                account_id: account.id,
                purpose: OtpPurpose.reset,
                used_at: null,
            },
            orderBy: { created_at: "desc" },
        });
        if (!otpRecord) {
            return responseFormatter({ valid: false }, undefined, "OTP invalid.", 200);
        }
        if (otpRecord.expires_at.getTime() <= Date.now()) {
            return responseFormatter({ valid: false }, undefined, "OTP expired.", 200);
        }
        const isValid = await this.bcryptService.bcryptCompare(
            otp,
            otpRecord.code,
            "otp"
        );
        return responseFormatter({ valid: isValid }, undefined, isValid ? "OTP valid." : "OTP invalid.", 200);
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { email, otp, newPassword } = resetPasswordDto;
        const account = await this.prisma.account.findUnique({
            where: { email },
            include: { credential: true },
        });
        if (!account || !account.credential) {
            throw new BadRequestException("Invalid OTP.");
        }
        const otpRecord = await this.prisma.otp.findFirst({
            where: {
                account_id: account.id,
                purpose: OtpPurpose.reset,
                used_at: null,
            },
            orderBy: { created_at: "desc" },
        });
        if (!otpRecord) {
            throw new BadRequestException("Invalid OTP.");
        }
        if (otpRecord.expires_at.getTime() <= Date.now()) {
            throw new BadRequestException("OTP has expired.");
        }
        const isValid = await this.bcryptService.bcryptCompare(
            otp,
            otpRecord.code,
            "otp"
        );
        if (!isValid) {
            throw new BadRequestException("Invalid OTP.");
        }
        const newHash = await this.bcryptService.bcryptHash(newPassword, "password");
        await this.prisma.$transaction(async (tx) => {
            await tx.credential.update({
                where: { id: account.credential.id },
                data: { password_hash: newHash },
            });
            await tx.otp.update({
                where: { id: otpRecord.id },
                data: { used_at: new Date() },
            });
        });
        return responseFormatter({ success: true }, undefined, "Password reset successfully.", 200);
    }

    private generateOtpCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
}
