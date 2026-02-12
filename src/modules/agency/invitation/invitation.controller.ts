import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationService } from './invitation.service';
import { ValidateInvitationDto } from './dto/validate-invitation.dto';

@ApiTags("Invitations")
@Controller('invitation')
export class InvitationController {
    constructor(private readonly invitationService: InvitationService) { }

    @Post()
    @ApiBearerAuth("access-token")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Create invitation and send email" })
    async createInvitation(
        @Req() req: { user: AccessTokenPayload },
        @Body() dto: CreateInvitationDto,
    ) {
        return this.invitationService.createInvitationFromEndpointForAccount(req.user.id, dto);
    }

    @Get("/validate")
    @ApiOperation({ summary: "validate invitation token" })
    @ApiQuery({ name: "token", type: String, required: true })
    async validateInvitation(@Query() dto: ValidateInvitationDto) {
        return this.invitationService.validateInvitation(dto.token);
    }
}
