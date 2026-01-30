import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { OtpPurpose } from 'src/generated/prisma/client';
import { BcryptService } from 'src/shared/services/bcrypt.services';
import { MailGunService } from 'src/shared/services/mailgun.services';
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

@Injectable()
export class AgencyService {
    private readonly logger = new Logger(AgencyService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly bcryptService: BcryptService,
        private readonly mailGunService: MailGunService,
        private readonly jwtService: JwtService,
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
        await this.mailGunService.sendEmail(
            email,
            "Welcome to Plato Hiring",
            undefined,
            signupTemplate(displayName, verifyEmailUrl),
        );
        return responseFormatter(account, undefined, "Account created successfully.", 201);
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        const account = await this.prisma.account.findFirst({
            where: { email },
            include: { credential: true },
        });
        if (!account || !account.credential) {
            throw new BadRequestException("Invalid email or password.");
        }
        if (!(account as { verified?: boolean }).verified) {
            throw new BadRequestException("Account not verified. Please verify your email.");
        }
        const isValid = await this.bcryptService.bcryptCompare(password, account.credential.password_hash, "password");
        if (!isValid) {
            throw new BadRequestException("Invalid email or password.");
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
            200
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
            },
        });
        if (!account) {
            throw new BadRequestException("Account not found.");
        }
        const name = `${account.f_name} ${account.l_name}`.trim();
        return responseFormatter(
            {
                f_name: account.f_name ?? "",
                l_name: account.l_name ?? "",
                user_name: account.user_name ?? "",
                name,
                email: account.email,
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
        await this.mailGunService.sendEmail(
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
            include: { agency: true },
        });
        if (!account) {
            throw new BadRequestException("Account not found.");
        }
        const agency = account.agency;
        const isComplete = Boolean(
            agency?.company_name &&
            agency?.organization_url &&
            agency?.company_size &&
            agency?.company_industry
        );
        return responseFormatter(
            {
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
        await this.mailGunService.sendEmail(
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
