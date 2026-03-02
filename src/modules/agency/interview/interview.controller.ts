import { BadRequestException, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { AgencyInterviewService } from "./interview.service";
import { GetInterviewSessionsDto } from "./dto/get-interview-sessions.dto";
import { GetInterviewStatsDto } from "./dto/get-interview-stats.dto";

@ApiTags("Agency Interview")
@Controller("interview")
export class AgencyInterviewController {
    constructor(private readonly interviewService: AgencyInterviewService) { }

    @Get("statistics")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Get agency interview statistics" })
    async getInterviewStatistics(
        @Query() options: GetInterviewStatsDto,
        @Req() req: { user?: { id: number } }
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException("Invalid user");
        }
        return this.interviewService.getInterviewStatistics(options, userId);
    }

    @Get("sessions")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "List agency interview sessions" })
    async getInterviewSessions(
        @Query() options: GetInterviewSessionsDto,
        @Req() req: { user?: { id: number } }
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException("Invalid user");
        }
        return this.interviewService.getInterviewSessions(options, userId);
    }

    @Get("sessions/:id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Get interview session details" })
    async getInterviewSessionDetails(
        @Param("id", ParseIntPipe) id: number,
        @Req() req: { user?: { id: number } }
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException("Invalid user");
        }
        return this.interviewService.getInterviewSessionDetails(id, userId);
    }

    @Post("sessions/:id/generate-profile")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Trigger generated profile for completed interview session" })
    async generateProfileNow(
        @Param("id", ParseIntPipe) id: number,
        @Req() req: { user?: { id: number } }
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException("Invalid user");
        }
        return this.interviewService.generateProfileNow(id, userId);
    }
}

