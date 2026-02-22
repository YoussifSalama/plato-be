import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SendInvitationDtoBody } from './dto/send-invitation.dto';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';
import { SignupWithInvitationDto } from './dto/signup-with-invitation.dto';

@Controller('team')
export class TeamController {
    constructor(private readonly teamService: TeamService) { }

    @Post('invite')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: 'Invite a team member to join the agency' })
    @ApiBody({ type: SendInvitationDtoBody, description: 'Data required to send a team invitation' })
    async sendInvitation(
        @Req() req: { user: AccessTokenPayload },
        @Body() body: SendInvitationDtoBody
    ) {
        const agencyId = req.user.id;

        if (!agencyId) throw new BadRequestException('Agency ID missing from token');

        return this.teamService.sendInvitation({
            agencyId,
            email: body.email,
            memberName: body.memberName,
        });
    }

    @Post('join/:org/:code')
    @ApiOperation({ summary: 'Use an invitation link to join a team' })
    @ApiParam({ name: 'org', description: 'Organization ID of the agency' })
    @ApiParam({ name: 'code', description: 'Invitation code sent via email' })
    async useInvitation(
        @Param('org') org: string,
        @Param('code') code: string,
    ) {
        if (!org || !code) throw new BadRequestException('Organization ID and invitation code are required.');

        return this.teamService.useInvitation(org, code);
    }

    @Get('invitation/check/:org/:code')
    @ApiOperation({ summary: 'Check if an invitation link is valid without consuming it' })
    @ApiParam({ name: 'org', description: 'Organization ID' })
    @ApiParam({ name: 'code', description: 'Invitation code' })
    async checkInvitation(
        @Param('org') org: string,
        @Param('code') code: string,
    ) {
        if (!org || !code) throw new BadRequestException('Organization ID and invitation code are required.');
        return this.teamService.checkInvitation(org, code);
    }

    @Post('invitation/signup/:org/:code')
    @ApiOperation({ summary: 'Create an account using a valid invitation link' })
    @ApiParam({ name: 'org', description: 'Organization ID' })
    @ApiParam({ name: 'code', description: 'Invitation code' })
    @ApiBody({ type: SignupWithInvitationDto })
    async signupWithInvitation(
        @Param('org') org: string,
        @Param('code') code: string,
        @Body() body: SignupWithInvitationDto,
    ) {
        if (!org || !code) throw new BadRequestException('Organization ID and invitation code are required.');
        return this.teamService.signupWithInvitation(org, code, body);
    }
}