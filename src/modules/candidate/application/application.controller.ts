import { Controller, Post, Get, Param, UseGuards, Req, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';
import { paginationDto } from 'src/shared/dto/pagination.dto';

@ApiTags('Job Applications')
@Controller('candidate/applications')
export class ApplicationController {
    constructor(private readonly applicationService: ApplicationService) { }

    @Get()
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get all applied jobs for the candidate' })
    async getAppliedJobs(
        @Req() req: { user: AccessTokenPayload },
        @Query() query: paginationDto
    ) {
        return this.applicationService.getAppliedJobs(req.user.id, query);
    }

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
