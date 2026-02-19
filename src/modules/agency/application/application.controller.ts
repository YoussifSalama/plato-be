import { Controller, Get, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgencyApplicationService } from './application.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';

@ApiTags('Agency Job Applications')
@Controller('agency/jobs')
export class AgencyApplicationController {
    constructor(private readonly applicationService: AgencyApplicationService) { }

    @Get(':jobId/applications')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get applications for a job' })
    async getApplications(
        @Req() req: { user: AccessTokenPayload },
        @Param('jobId', ParseIntPipe) jobId: number
    ) {
        return this.applicationService.getApplications(jobId, req.user.id);
    }
}
