import { BadRequestException, Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SendInvitationDtoBody } from './dto/send-invitation.dto';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';

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

        if (!agencyId) {
            throw new BadRequestException('Agency ID missing from token');
        }

        return this.teamService.sendInvitation({
            agencyId,
            email: body.email,
            memberName: body.memberName,
        });
    }
}
