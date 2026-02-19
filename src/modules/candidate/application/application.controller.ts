import { Controller, Post, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';

@ApiTags('Job Applications')
@Controller('candidate/applications')
export class ApplicationController {
    constructor(private readonly applicationService: ApplicationService) { }

    @Post(':jobId')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Apply for a job' })
    async apply(
        @Req() req: { user: AccessTokenPayload },
        @Param('jobId', ParseIntPipe) jobId: number
    ) {
        return this.applicationService.apply(req.user.id, jobId);
    }
}
