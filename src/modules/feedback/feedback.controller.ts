import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards, InternalServerErrorException } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackFrom } from "../../generated/prisma";

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) {}

    @Post('agency/submit')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Submit feedback as an agency' })
    async submitAgencyFeedback(@Req() req: any, @Body() dto: SubmitFeedbackDto) {
        return this.feedbackService.submitFeedback(req.user.id, FeedbackFrom.agency, dto);
    }

    @Post('candidate/submit')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Submit feedback as a candidate' })
    async submitCandidateFeedback(@Req() req: any, @Body() dto: SubmitFeedbackDto) {
        return this.feedbackService.submitFeedback(req.user.id, FeedbackFrom.candidate, dto);
    }

    @Get('agency/session/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get feedback for a session (Agency view)' })
    async getAgencyFeedback(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        try {
            return await this.feedbackService.getFeedback(req.user.id, FeedbackFrom.agency, id);
        } catch (error) {
            console.error("GET AGENCY FEEDBACK ERROR:", error);
            throw new InternalServerErrorException(error.message || "Failed to get feedback");
        }
    }

    @Get('candidate/session/:id')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get feedback for a session (Candidate view)' })
    async getCandidateFeedback(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.feedbackService.getFeedback(req.user.id, FeedbackFrom.candidate, id);
    }
}
