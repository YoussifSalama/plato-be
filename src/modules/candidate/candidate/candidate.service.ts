import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { BcryptService } from "src/shared/services/bcrypt.services";
import { JwtService } from "src/shared/services/jwt.services";
import responseFormatter from "src/shared/helpers/response";
import { IJwtProvider } from "src/shared/types/services/jwt.types";
import { SendGridService } from "src/shared/services/sendgrid.services";
import { GoogleAuthService } from "src/shared/services/google-auth.service";
import signupTemplate from "src/shared/templates/agency/Signup.template";
import resendVerificationTemplate from "src/shared/templates/agency/ResendVerification.template";
import resetPasswordOtpTemplate from "src/shared/templates/agency/ResetPasswordOtp.template";
import { OtpPurpose } from "@generated/prisma";
import { CandidateSignupDto } from "./dto/signup.dto";
import { CandidateRequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { CandidateVerifyPasswordResetOtpDto } from "./dto/verify-password-reset-otp.dto";
import { CandidateResetPasswordDto } from "./dto/reset-password.dto";
import { CandidateChangePasswordDto } from "./dto/change-password.dto";
import { CandidateNotificationService } from "../notification/notification.service";

type ResumeStructuredData = {
    name?: string | null;
    email?: string | null;
    Email?: string | null;
    phone?: string | null;
    Phone?: string | null;
    contact?: {
        email?: string | null;
        Email?: string | null;
        phone?: string | null;
        Phone?: string | null;
    } | null;
};

@Injectable()
export class CandidateService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly bcryptService: BcryptService,
        private readonly jwtService: JwtService,
        private readonly sendGridService: SendGridService,
        private readonly googleAuthService: GoogleAuthService,
        private readonly configService: ConfigService,
        private readonly candidateNotificationService: CandidateNotificationService,
    ) { }

    private readonly logger = new Logger(CandidateService.name);

    private splitName(rawName?: string | null) {
        const name = rawName?.trim() ?? "";
        if (!name) {
            return { f_name: "Candidate", l_name: "User" };
        }
        const parts = name.split(/\s+/);
        if (parts.length === 1) {
            return { f_name: parts[0], l_name: "User" };
        }
        return { f_name: parts[0], l_name: parts.slice(1).join(" ") };
    }

    private resolveResumeContact(resume: { name: string; resume_structured?: { data: unknown } | null }) {
        const structured = resume.resume_structured?.data as ResumeStructuredData | null | undefined;
        const email =
            structured?.contact?.email ??
            structured?.contact?.Email ??
            structured?.email ??
            structured?.Email ??
            null;
        const phone =
            structured?.contact?.phone ??
            structured?.contact?.Phone ??
            structured?.phone ??
            structured?.Phone ??
            null;
        const name = structured?.name ?? resume.name ?? null;
        return { email, phone, name };
    }

    private async getInvitationContext(token: string) {
        const invitationToken = await this.prisma.invitationToken.findFirst({
            where: {
                token,
                revoked: false,
                expires_at: { gt: new Date() },
            },
            select: {
                id: true,
                candidate_id: true,
                invitation: {
                    select: {
                        id: true,
                        to: {
                            select: {
                                name: true,
                                resume_structured: { select: { data: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!invitationToken?.invitation) {
            throw new BadRequestException("Invalid invitation token.");
        }
        return {
            invitation: invitationToken.invitation,
            invitationTokenId: invitationToken.id,
            invitationTokenCandidateId: invitationToken.candidate_id,
        };
    }

    private generateTemporaryPassword() {
        return randomUUID().replace(/-/g, "").slice(0, 16);
    }

    private generateOtpCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    getCandidateFrontendUrl() {
        const rawUrl = this.configService.get<string>("env.frontendUrlCandidate");
        return rawUrl;
    }

    async createFromInvitation(token: string) {
        const {
            invitation,
            invitationTokenId,
            invitationTokenCandidateId,
        } = await this.getInvitationContext(token);
        const { email, phone, name } = this.resolveResumeContact(invitation.to);
        if (invitationTokenCandidateId) {
            const existingCandidate = await this.prisma.candidate.findUnique({
                where: { id: invitationTokenCandidateId },
                select: { id: true, email: true, invited: true },
            });
            if (existingCandidate) {
                return responseFormatter(
                    {
                        candidate_id: existingCandidate.id,
                        email: existingCandidate.email ?? null,
                        created: false,
                        invited: existingCandidate.invited,
                    },
                    undefined,
                    "Candidate account already exists for this token.",
                    200,
                );
            }
        }
        const existingByInvitation = await this.prisma.candidate.findFirst({
            where: { invitation_id: invitation.id },
            select: { id: true, email: true, invited: true },
        });
        if (existingByInvitation) {
            await this.prisma.invitationToken.update({
                where: { id: invitationTokenId },
                data: { candidate_id: existingByInvitation.id },
            });
            return responseFormatter(
                {
                    candidate_id: existingByInvitation.id,
                    email: existingByInvitation.email ?? null,
                    created: false,
                    invited: existingByInvitation.invited,
                },
                undefined,
                "Candidate account already exists.",
                200,
            );
        }

        const existingByEmail = email
            ? await this.prisma.candidate.findFirst({
                where: { email },
                select: { id: true, email: true, invited: true },
            })
            : null;
        if (existingByEmail) {
            await this.prisma.candidate.update({
                where: { id: existingByEmail.id },
                data: {
                    invitation_id: invitation.id,
                    invited: true,
                },
            });
            await this.prisma.invitationToken.update({
                where: { id: invitationTokenId },
                data: { candidate_id: existingByEmail.id },
            });
            return responseFormatter(
                {
                    candidate_id: existingByEmail.id,
                    email: existingByEmail.email ?? null,
                    created: false,
                    invited: true,
                },
                undefined,
                "Candidate account already exists.",
                200,
            );
        }

        const existingByPhone = phone
            ? await this.prisma.candidate.findFirst({
                where: { phone },
                select: { id: true, email: true, invited: true },
            })
            : null;
        if (existingByPhone) {
            await this.prisma.candidate.update({
                where: { id: existingByPhone.id },
                data: {
                    invitation_id: invitation.id,
                    invited: true,
                },
            });
            await this.prisma.invitationToken.update({
                where: { id: invitationTokenId },
                data: { candidate_id: existingByPhone.id },
            });
            return responseFormatter(
                {
                    candidate_id: existingByPhone.id,
                    email: existingByPhone.email ?? null,
                    created: false,
                    invited: true,
                },
                undefined,
                "Candidate account already exists.",
                200,
            );
        }

        const { f_name, l_name } = this.splitName(name);
        const candidateName =
            name?.trim() ||
            (phone ? `candidate-${phone}` : `candidate-${invitation.id}-${Date.now()}`);
        const tempPassword = this.generateTemporaryPassword();
        const passwordHash = await this.bcryptService.bcryptHash(tempPassword, "password");

        const credential = await this.prisma.candidateCredential.create({
            data: { password_hash: passwordHash },
            select: { id: true },
        });
        const candidate = await this.prisma.candidate.create({
            data: {
                email,
                phone,
                candidate_name: candidateName,
                f_name,
                l_name,
                invited: true,
                invitation_id: invitation.id,
                credential_id: credential.id,
            },
            select: { id: true, email: true },
        });
        await this.prisma.invitationToken.update({
            where: { id: invitationTokenId },
            data: { candidate_id: candidate.id },
        });

        return responseFormatter(
            {
                candidate_id: candidate.id,
                email: candidate.email ?? null,
                created: true,
                invited: true,
            },
            undefined,
            "Candidate account created.",
            201,
        );
    }

    async signup(dto: CandidateSignupDto) {
        const { email, f_name, l_name, password } = dto;
        const existing = await this.prisma.candidate.findFirst({ where: { email } });
        if (existing) {
            throw new BadRequestException("Email already in use.");
        }
        const passwordHash = await this.bcryptService.bcryptHash(password, "password");
        const verifyToken = randomUUID();
        const { candidate } = await this.prisma.$transaction(async (tx) => {
            const credential = await tx.candidateCredential.create({
                data: { password_hash: passwordHash },
            });
            const candidate = await tx.candidate.create({
                data: {
                    email,
                    f_name,
                    l_name,
                    credential_id: credential.id,
                    verified: false,
                },
            });
            await tx.candidateVerifyToken.create({
                data: {
                    token: verifyToken,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    candidate_id: candidate.id,
                },
            });


            // Check for existing agency-uploaded resume for this email
            // Type B User Linking Strategy
            const existingResume = await tx.resume.findFirst({
                where: {
                    resume_structured: {
                        is: {
                            data: {
                                path: ["contact", "email"],
                                string_contains: email,
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                include: { resume_structured: true }
            });

            if (existingResume && existingResume.resume_structured?.data) {
                // Link this resume data to the new profile
                // We copy the structured data to the profile to populate it
                await tx.profile.update({
                    where: { candidate_id: candidate.id },
                    data: {
                        resume_link: existingResume.link,
                        resume_parsed: existingResume.resume_structured.data as any,
                    }
                });
            }

            return { candidate };
        });

        const displayName = `${candidate.f_name} ${candidate.l_name}`.trim();
        const verifyEmailUrl = `${this.getCandidateFrontendUrl()}/auth/verify?token=${verifyToken}`;
        await this.sendGridService.sendEmail(
            candidate.email ?? "",
            "Verify your Plato candidate account",
            undefined,
            signupTemplate(displayName, verifyEmailUrl),
        );

        return responseFormatter(
            { success: true, email: candidate.email },
            undefined,
            "Account created. Please verify your email.",
            201,
        );
    }

    async completeInvitation(token: string, password: string) {
        const {
            invitation,
            invitationTokenId,
            invitationTokenCandidateId,
        } = await this.getInvitationContext(token);
        let candidate = await this.prisma.candidate.findFirst({
            where: invitationTokenCandidateId
                ? { id: invitationTokenCandidateId }
                : { invitation_id: invitation.id },
            include: { credential: true },
        });
        if (!candidate) {
            await this.createFromInvitation(token);
            candidate = await this.prisma.candidate.findFirst({
                where: invitationTokenCandidateId
                    ? { id: invitationTokenCandidateId }
                    : { invitation_id: invitation.id },
                include: { credential: true },
            });
        }
        if (!candidate || !candidate.credential) {
            throw new BadRequestException("Candidate account not found.");
        }

        const newHash = await this.bcryptService.bcryptHash(password, "password");
        await this.prisma.candidateCredential.update({
            where: { id: candidate.credential.id },
            data: { password_hash: newHash },
        });
        await this.prisma.candidate.update({
            where: { id: candidate.id },
            data: { verified: true },
        });
        await this.prisma.invitationToken.update({
            where: { id: invitationTokenId },
            data: { candidate_id: candidate.id },
        });

        const tokenPayload = { id: candidate.id, provider: IJwtProvider.candidate };
        const access_token = await this.jwtService.generateAccessToken(tokenPayload);
        const refresh = await this.jwtService.generateRefreshToken(tokenPayload);
        await this.prisma.candidateToken.create({
            data: {
                refresh_token: refresh.refresh_token,
                candidate_id: candidate.id,
            },
        });

        return responseFormatter(
            {
                access_token,
                refresh_token: refresh.refresh_token,
                refresh_expires_at: refresh.expires_at,
                email: candidate.email ?? null,
            },
            undefined,
            "Password set successfully.",
            200,
        );
    }

    async login(email: string, password: string) {
        const candidate = await this.prisma.candidate.findFirst({
            where: { email },
            include: { credential: true },
        });
        if (!candidate || !candidate.credential) {
            throw new BadRequestException("Wrong credentials.");
        }
        const isValid = await this.bcryptService.bcryptCompare(
            password,
            candidate.credential.password_hash,
            "password",
        );
        if (!isValid) {
            throw new BadRequestException("Wrong credentials.");
        }
        if (!candidate.verified) {
            throw new BadRequestException("Account not verified. Please verify your email.");
        }

        const tokenPayload = { id: candidate.id, provider: IJwtProvider.candidate };
        const access_token = await this.jwtService.generateAccessToken(tokenPayload);
        const refresh = await this.jwtService.generateRefreshToken(tokenPayload);
        await this.prisma.candidateToken.create({
            data: {
                refresh_token: refresh.refresh_token,
                candidate_id: candidate.id,
            },
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

    async loginWithGoogle(idToken: string) {
        const profile = await this.googleAuthService.verifyCandidateIdToken(idToken);
        const email = profile.email.toLowerCase();

        // Try match by google_id first
        let candidate = await this.prisma.candidate.findFirst({
            where: { google_id: profile.sub },
            include: { credential: true },
        });

        if (!candidate) {
            // Fallback: match by email
            candidate = await this.prisma.candidate.findFirst({
                where: { email },
                include: { credential: true },
            });
        }

        if (!candidate) {
            // Create new candidate account
            const tempPassword = this.generateTemporaryPassword();
            const passwordHash = await this.bcryptService.bcryptHash(tempPassword, "password");
            const verifyToken = randomUUID();

            const created = await this.prisma.$transaction(async (tx) => {
                const credential = await tx.candidateCredential.create({
                    data: { password_hash: passwordHash },
                    select: { id: true },
                });
                const candidate = await tx.candidate.create({
                    data: {
                        email,
                        f_name: profile.givenName || 'Candidate',
                        l_name: profile.familyName || 'User',
                        verified: true,
                        invited: false,
                        credential_id: credential.id,
                        google_id: profile.sub,
                        auth_provider: 'google',
                    },
                });

                await tx.candidateVerifyToken.create({
                    data: {
                        token: verifyToken,
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        candidate_id: candidate.id,
                    },
                });

                return candidate;
            });

            candidate = created as any;
        } else {
            // Ensure google_id / provider are linked and mark verified
            await this.prisma.candidate.update({
                where: { id: candidate.id },
                data: {
                    google_id: candidate.google_id ?? profile.sub,
                    auth_provider: candidate.auth_provider ?? 'google',
                    verified: true,
                },
            });
        }

        const tokenPayload = { id: candidate!.id, provider: IJwtProvider.candidate };
        const access_token = await this.jwtService.generateAccessToken(tokenPayload);
        const refresh = await this.jwtService.generateRefreshToken(tokenPayload);
        await this.prisma.candidateToken.create({
            data: {
                refresh_token: refresh.refresh_token,
                candidate_id: candidate!.id,
            },
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

    async refreshAccessToken(refreshToken: string) {
        const tokenRecord = await this.prisma.candidateToken.findFirst({
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
        if (payload.provider !== IJwtProvider.candidate || payload.id !== tokenRecord.candidate_id) {
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
        await this.prisma.candidateToken.deleteMany({
            where: { refresh_token: refreshToken },
        });
        return responseFormatter({ success: true }, undefined, "Logged out successfully.", 200);
    }

    async getMyCandidateAccountData(candidateId: number) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            select: {
                id: true,
                email: true,
                phone: true,
                candidate_name: true,
                f_name: true,
                l_name: true,
                verified: true,
                invited: true,
            },
        });
        if (!candidate) {
            throw new BadRequestException("Candidate not found.");
        }
        const name =
            candidate.candidate_name?.trim() ||
            `${candidate.f_name ?? ""} ${candidate.l_name ?? ""}`.trim();
        return responseFormatter(
            {
                id: candidate.id,
                email: candidate.email ?? null,
                phone: candidate.phone ?? null,
                candidate_name: candidate.candidate_name ?? null,
                f_name: candidate.f_name ?? "",
                l_name: candidate.l_name ?? "",
                name,
                verified: candidate.verified,
                invited: candidate.invited,
            },
            undefined,
            "Candidate data retrieved.",
            200
        );
    }

    async changePassword(candidateId: number, changePasswordDto: CandidateChangePasswordDto) {
        const { oldPassword, newPassword } = changePasswordDto;
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { credential: true },
        });
        if (!candidate || !candidate.credential) {
            throw new BadRequestException("Candidate not found.");
        }
        const isValid = await this.bcryptService.bcryptCompare(
            oldPassword,
            candidate.credential.password_hash,
            "password"
        );
        if (!isValid) {
            throw new BadRequestException("Invalid current password.");
        }
        if (oldPassword === newPassword) {
            throw new BadRequestException("New password must be different.");
        }
        const newHash = await this.bcryptService.bcryptHash(newPassword, "password");
        await this.prisma.candidateCredential.update({
            where: { id: candidate.credential.id },
            data: { password_hash: newHash },
        });

        this.candidateNotificationService.emitAccountUpdate(candidateId, { type: 'PASSWORD_CHANGED' });

        return responseFormatter({ success: true }, undefined, "Password updated successfully.", 200);
    }

    async verifyAccountToken(token: string) {
        const record = await this.prisma.candidateVerifyToken.findFirst({
            where: { token },
            include: { candidate: true },
        });
        if (!record) {
            return responseFormatter({ valid: false }, undefined, "Invalid token.", 200);
        }
        const isExpired = record.expires_at.getTime() <= Date.now();
        const isUsed = Boolean(record.used_at);
        if (isExpired || isUsed) {
            return responseFormatter({ valid: false }, undefined, "Invalid or expired token.", 200);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.candidateVerifyToken.update({
                where: { id: record.id },
                data: { used_at: new Date() },
            });
            await tx.candidate.update({
                where: { id: record.candidate.id },
                data: { verified: true },
            });
        });
        return responseFormatter({ valid: true }, undefined, "Account verified.", 200);
    }

    async resendVerificationToken(token: string) {
        const record = await this.prisma.candidateVerifyToken.findFirst({
            where: { token },
            include: { candidate: true },
        });
        if (!record) {
            throw new BadRequestException("Token not found.");
        }
        if (!record.used_at) {
            await this.prisma.candidateVerifyToken.update({
                where: { id: record.id },
                data: { used_at: new Date() },
            });
        }
        const newToken = randomUUID();
        await this.prisma.candidateVerifyToken.create({
            data: {
                token: newToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                candidate_id: record.candidate.id,
            },
        });
        const displayName = `${record.candidate.f_name} ${record.candidate.l_name}`.trim();
        const verifyEmailUrl = `${this.getCandidateFrontendUrl()}/auth/verify?token=${newToken}`;
        await this.sendGridService.sendEmail(
            record.candidate.email ?? "",
            "Verify your Plato candidate account",
            undefined,
            resendVerificationTemplate(displayName, verifyEmailUrl),
        );
        return responseFormatter({ success: true }, undefined, "Verification email sent.", 200);
    }

    async requestPasswordReset(dto: CandidateRequestPasswordResetDto) {
        const { email } = dto;
        const candidate = await this.prisma.candidate.findUnique({ where: { email } });
        if (!candidate) {
            return responseFormatter({ success: true }, undefined, "Reset OTP sent.", 200);
        }
        const otpCode = this.generateOtpCode();
        if (process.env.NODE_ENV !== "production") {
            this.logger.warn(`Candidate password reset OTP for ${email}: ${otpCode}`);
        }
        const hashedCode = await this.bcryptService.bcryptHash(otpCode, "otp");
        await this.prisma.candidateOtp.updateMany({
            where: {
                candidate_id: candidate.id,
                purpose: OtpPurpose.reset,
                used_at: null,
            },
            data: { used_at: new Date() },
        });
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.candidateOtp.create({
            data: {
                code: hashedCode,
                purpose: OtpPurpose.reset,
                expires_at: expiresAt,
                candidate_id: candidate.id,
            },
        });
        const displayName = `${candidate.f_name} ${candidate.l_name}`.trim();
        await this.sendGridService.sendEmail(
            candidate.email ?? "",
            "Reset your Plato candidate password",
            undefined,
            resetPasswordOtpTemplate(displayName, otpCode),
        );
        return responseFormatter({ success: true }, undefined, "Reset OTP sent.", 200);
    }

    async verifyPasswordResetOtp(dto: CandidateVerifyPasswordResetOtpDto) {
        const { email, otp } = dto;
        const candidate = await this.prisma.candidate.findUnique({ where: { email } });
        if (!candidate) {
            return responseFormatter({ valid: false }, undefined, "OTP invalid.", 200);
        }
        const otpRecord = await this.prisma.candidateOtp.findFirst({
            where: {
                candidate_id: candidate.id,
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
        const isValid = await this.bcryptService.bcryptCompare(otp, otpRecord.code, "otp");
        return responseFormatter({ valid: isValid }, undefined, isValid ? "OTP valid." : "OTP invalid.", 200);
    }

    async resetPassword(dto: CandidateResetPasswordDto) {
        const { email, otp, newPassword } = dto;
        const candidate = await this.prisma.candidate.findUnique({
            where: { email },
            include: { credential: true },
        });
        if (!candidate || !candidate.credential) {
            throw new BadRequestException("Invalid OTP.");
        }
        const otpRecord = await this.prisma.candidateOtp.findFirst({
            where: {
                candidate_id: candidate.id,
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
        const isValid = await this.bcryptService.bcryptCompare(otp, otpRecord.code, "otp");
        if (!isValid) {
            throw new BadRequestException("Invalid OTP.");
        }
        const newHash = await this.bcryptService.bcryptHash(newPassword, "password");
        await this.prisma.$transaction(async (tx) => {
            await tx.candidateCredential.update({
                where: { id: candidate.credential.id },
                data: { password_hash: newHash },
            });
            await tx.candidateOtp.update({
                where: { id: otpRecord.id },
                data: { used_at: new Date() },
            });
        });
        return responseFormatter({ success: true }, undefined, "Password reset successfully.", 200);
    }
}

