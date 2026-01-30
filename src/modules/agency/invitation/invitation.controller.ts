import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationService } from './invitation.service';

@ApiTags("Invitations")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller('invitation')
export class InvitationController {
    constructor(private readonly invitationService: InvitationService) { }

    @Post()
    @ApiOperation({ summary: "Create invitation and send email" })
    async createInvitation(
        @Req() req: { user: AccessTokenPayload },
        @Body() dto: CreateInvitationDto,
    ) {
        return this.invitationService.createInvitationFromEndpointForAccount(req.user.id, dto);
    }
}
