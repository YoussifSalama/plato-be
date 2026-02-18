import { Body, Controller, Get, HttpCode, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CandidateJwtAuthGuard } from "src/shared/guards/candidate-jwt-auth.guard";
import { AccessTokenPayload } from "src/shared/types/services/jwt.types";
import { CandidateService } from "./candidate.service";
import { CandidateChangePasswordDto } from "./dto/change-password.dto";
import { InvitationCreateDto } from "./dto/invitation-create.dto";
import { InvitationCompleteDto } from "./dto/invitation-complete.dto";
import { CandidateLoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { CandidateSignupDto } from "./dto/signup.dto";
import { CandidateRequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { CandidateVerifyPasswordResetOtpDto } from "./dto/verify-password-reset-otp.dto";
import { CandidateResetPasswordDto } from "./dto/reset-password.dto";
import { CandidateVerifyAccountDto } from "./dto/verify-account.dto";
import { CandidateResendVerificationDto } from "./dto/resend-verification.dto";

@ApiTags("Auth")
@Controller("candidate")
export class CandidateController {
    constructor(private readonly candidateService: CandidateService) { }

    @Post("invitation/create")
    @ApiOperation({ summary: "Create candidate account from invitation token" })
    async createFromInvitation(@Body() dto: InvitationCreateDto) {
        return this.candidateService.createFromInvitation(dto.token);
    }

    @Post("invitation/complete")
    @ApiOperation({ summary: "Set candidate password and login" })
    async completeInvitation(@Body() dto: InvitationCompleteDto) {
        return this.candidateService.completeInvitation(dto.token, dto.password);
    }

    @Post("login")
    @ApiOperation({ summary: "Candidate login" })
    async login(@Body() dto: CandidateLoginDto) {
        return this.candidateService.login(dto.email, dto.password);
    }

    @Post("signup")
    @ApiOperation({ summary: "Create candidate account" })
    async signup(@Body() dto: CandidateSignupDto) {
        return this.candidateService.signup(dto);
    }

    @Post("password/reset/request")
    @ApiOperation({ summary: "Request password reset OTP" })
    async requestPasswordReset(@Body() dto: CandidateRequestPasswordResetDto) {
        return this.candidateService.requestPasswordReset(dto);
    }

    @Post("password/reset/verify")
    @ApiOperation({ summary: "Verify password reset OTP" })
    async verifyPasswordResetOtp(@Body() dto: CandidateVerifyPasswordResetOtpDto) {
        return this.candidateService.verifyPasswordResetOtp(dto);
    }

    @Post("password/reset/confirm")
    @ApiOperation({ summary: "Reset password with OTP" })
    async resetPassword(@Body() dto: CandidateResetPasswordDto) {
        return this.candidateService.resetPassword(dto);
    }

    @Get("verify-account")
    @ApiOperation({ summary: "Verify candidate account via token" })
    async verifyAccount(@Query() query: CandidateVerifyAccountDto, @Res() res: Response) {
        const result = await this.candidateService.verifyAccountToken(query.token);
        if (result.data?.valid) {
            const redirectUrl = this.candidateService.getCandidateFrontendUrl();
            if (redirectUrl) {
                return res.redirect(redirectUrl);
            }
        }
        return res.status(200).json({ valid: false });
    }

    @Post("verify-account/confirm")
    @HttpCode(200)
    @ApiOperation({ summary: "Verify candidate account via token (JSON)" })
    async verifyAccountConfirm(@Body() dto: CandidateVerifyAccountDto) {
        const result = await this.candidateService.verifyAccountToken(dto.token);
        return result;
    }

    @Post("resend-verification")
    @HttpCode(200)
    @ApiOperation({ summary: "Resend candidate verification email" })
    async resendVerification(@Body() dto: CandidateResendVerificationDto) {
        return this.candidateService.resendVerificationToken(dto.token);
    }

    @Post("token/refresh")
    @HttpCode(200)
    @ApiOperation({ summary: "Refresh access token" })
    async refreshToken(@Body() body: RefreshTokenDto) {
        return this.candidateService.refreshAccessToken(body.refresh_token);
    }

    @Post("logout")
    @HttpCode(200)
    @ApiOperation({ summary: "Logout and revoke refresh token" })
    async logout(@Body() body: RefreshTokenDto) {
        return this.candidateService.logout(body.refresh_token);
    }

    @Get("account/me")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Get candidate account data" })
    async getMyCandidateAccount(@Req() req: { user: AccessTokenPayload }) {
        return this.candidateService.getMyCandidateAccountData(req.user.id);
    }

    @Patch("password")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Change candidate password" })
    async changePassword(
        @Req() req: { user: AccessTokenPayload },
        @Body() body: CandidateChangePasswordDto
    ) {
        return this.candidateService.changePassword(req.user.id, body);
    }
}

