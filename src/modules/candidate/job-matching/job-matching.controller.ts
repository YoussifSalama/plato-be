import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
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
}
