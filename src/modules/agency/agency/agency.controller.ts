import { Body, Controller, Get, HttpCode, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';
import { AgencyService } from './agency.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto';
import invalidTokenTemplate from 'src/shared/templates/agency/InvalidToken.template';
import responseFormatter from 'src/shared/helpers/response';

@ApiTags('Agency')
@Controller('agency')
export class AgencyController {
    constructor(
        private readonly agencyService: AgencyService,
        private readonly configService: ConfigService,
    ) { }

    @Post('signup')
    @ApiOperation({ summary: "Create agency account" })
    async signup(@Body() signupDto: SignupDto) {
        return this.agencyService.signup(signupDto);
    }

    @Post('login')
    @HttpCode(200)
    @ApiOperation({ summary: "Login and get tokens" })
    async login(@Body() loginDto: LoginDto) {
        return this.agencyService.login(loginDto);
    }

    @Post('token/refresh')
    @HttpCode(200)
    @ApiOperation({ summary: "Refresh access token" })
    async refreshToken(@Body() body: RefreshTokenDto) {
        return this.agencyService.refreshAccessToken(body.refresh_token);
    }

    @Post('logout')
    @HttpCode(200)
    @ApiOperation({ summary: "Logout and revoke refresh token" })
    async logout(@Body() body: RefreshTokenDto) {
        return this.agencyService.logout(body.refresh_token);
    }

    @Get('verify-account')
    @ApiOperation({ summary: "Verify account via token" })
    async verifyAccount(@Query() query: VerifyAccountDto, @Res() res: Response) {
        const { token } = query;
        const result = await this.agencyService.verifyAccountToken(token);
        if (result.valid) {
            const frontendUrl = this.configService.get<string>("env.frontendUrl") ?? "http://localhost:3001";
            return res.redirect(frontendUrl);
        }
        return res.status(200).send(invalidTokenTemplate(token));
    }

    @Post('verify-account/confirm')
    @HttpCode(200)
    @ApiOperation({ summary: "Verify account via token (JSON)" })
    async verifyAccountConfirm(@Body() body: VerifyAccountDto) {
        const result = await this.agencyService.verifyAccountToken(body.token);
        return responseFormatter(
            { valid: result.valid },
            undefined,
            result.valid ? "Account verified." : "Invalid or expired token.",
            200
        );
    }

    @Post('resend-verification')
    @HttpCode(200)
    @ApiOperation({ summary: "Resend verification email" })
    async resendVerification(@Body() body: ResendVerificationDto) {
        return this.agencyService.resendVerificationToken(body.token);
    }

    @Post('password/reset/request')
    @HttpCode(200)
    @ApiOperation({ summary: "Request password reset OTP" })
    async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
        return this.agencyService.requestPasswordReset(body);
    }

    @Post('password/reset/verify')
    @HttpCode(200)
    @ApiOperation({ summary: "Verify password reset OTP" })
    async verifyPasswordResetOtp(@Body() body: VerifyPasswordResetOtpDto) {
        return this.agencyService.verifyPasswordResetOtp(body);
    }

    @Post('password/reset/confirm')
    @HttpCode(200)
    @ApiOperation({ summary: "Reset password using OTP" })
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.agencyService.resetPassword(body);
    }

    @Get('overview')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: "Get agency onboarding overview" })
    async getOverview(@Req() req: { user: AccessTokenPayload }) {
        return this.agencyService.getAgencyOverview(req.user.id);
    }

    @Get('account/me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: "Get account owner name and email" })
    async getMyAgencyAccountData(@Req() req: { user: AccessTokenPayload }) {
        return this.agencyService.getMyAgencyAccountData(req.user.id);
    }

    @Patch('brand')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: "Update account profile (brand)" })
    async updateBrand(@Req() req: { user: AccessTokenPayload }, @Body() body: UpdateAccountDto) {
        return this.agencyService.updateBrand(req.user.id, body);
    }

    @Patch('agency')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: "Update agency data" })
    async updateAgency(@Req() req: { user: AccessTokenPayload }, @Body() body: UpdateAgencyDto) {
        return this.agencyService.updateAgency(req.user.id, body);
    }

    @Patch('password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: "Change account password" })
    async changePassword(@Req() req: { user: AccessTokenPayload }, @Body() body: ChangePasswordDto) {
        return this.agencyService.changePassword(req.user.id, body);
    }

}
