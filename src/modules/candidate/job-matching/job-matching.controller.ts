import { Controller, Get, Post, Delete, UseGuards, Req, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobMatchingService } from './job-matching.service';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';

@ApiTags('Job Matching')
@Controller('candidate/jobs')
export class JobMatchingController {
    constructor(private readonly jobMatchingService: JobMatchingService) { }

    @Get('match')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get job matches (computes and saves if not exist)' })
    async getMatchedJobs(@Req() req: { user: AccessTokenPayload }) {
        return this.jobMatchingService.matchJobs(req.user.id);
    }

    @Get('matched')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get saved job matches from database' })
    async getSavedMatches(@Req() req: { user: AccessTokenPayload }) {
        return this.jobMatchingService.getSavedMatches(req.user.id);
    }

    @Post('match/refresh')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Re-evaluate all jobs and update matches' })
    async refreshMatches(@Req() req: { user: AccessTokenPayload }) {
        return this.jobMatchingService.refreshMatches(req.user.id);
    }

    @Post(':id/save')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Save a job' })
    async saveJob(@Req() req: { user: AccessTokenPayload }, @Param('id') jobId: string) {
        return this.jobMatchingService.saveJob(req.user.id, parseInt(jobId, 10));
    }

    @Delete(':id/save')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Unsave a job' })
    async unsaveJob(@Req() req: { user: AccessTokenPayload }, @Param('id') jobId: string) {
        return this.jobMatchingService.unsaveJob(req.user.id, parseInt(jobId, 10));
    }

    @Get('saved')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get saved jobs' })
    async getSavedJobs(
        @Req() req: { user: AccessTokenPayload },
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.jobMatchingService.getSavedJobs(req.user.id, pageNum, limitNum);
    }
}
