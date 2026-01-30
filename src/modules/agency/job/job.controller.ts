import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { CreateJobDto } from "./dto/create-job.dto";
import { CreateJobAiPromptDto } from "./dto/create-job-ai-prompt.dto";
import { GetJobsDto } from "./dto/get-jobs.dto";
import { SearchJobsDto } from "./dto/search-jobs.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobService } from "./job.service";
import { AccessTokenPayload } from "src/shared/types/services/jwt.types";
import { GetJobResumesDto } from "./dto/get-job-resumes.dto";

@ApiTags("Agency Jobs")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("agency/jobs")
export class JobController {
    constructor(private readonly jobService: JobService) { }

    @Post()
    @ApiOperation({ summary: "Create a new job" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async create(@Req() req: { user: AccessTokenPayload }, @Body() dto: CreateJobDto) {
        const userId = req.user.id;
        return this.jobService.createJob(userId, dto);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update an existing job" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async update(@Req() req: { user: AccessTokenPayload }, @Param("id", ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
        const userId = req.user.id;
        return this.jobService.updateJob(userId, id, dto);
    }

    @Get()
    @ApiOperation({ summary: "Get jobs with search and pagination" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getJobs(@Req() req: { user: AccessTokenPayload }, @Query() query: GetJobsDto) {
        const userId = req.user.id;
        return this.jobService.getJobs(userId, query);
    }

    @Get("search")
    @ApiOperation({ summary: "Search active jobs for combobox" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async searchJobs(
        @Req() req: { user: AccessTokenPayload },
        @Query() query: SearchJobsDto
    ) {
        const userId = req.user.id;
        return this.jobService.searchActiveJobs(userId, query);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get job details" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getJobById(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
    ) {
        const userId = req.user.id;
        return this.jobService.getJobById(userId, id);
    }

    @Get(":id/resumes")
    @ApiOperation({ summary: "Get resumes analyzed for a job" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getJobResumes(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
        @Query() query: GetJobResumesDto,
    ) {
        const userId = req.user.id;
        return this.jobService.getJobResumes(userId, id, query);
    }

    @Patch(":id/activate")
    @ApiOperation({ summary: "Activate job" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async activateJob(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
    ) {
        const userId = req.user.id;
        return this.jobService.setJobActiveStatus(userId, id, true);
    }

    @Patch(":id/inactivate")
    @ApiOperation({ summary: "Inactivate job" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async inactivateJob(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
    ) {
        const userId = req.user.id;
        return this.jobService.setJobActiveStatus(userId, id, false);
    }

    @Post(":id/ai-prompt")
    @ApiOperation({ summary: "Create or update AI prompt for job" })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async upsertJobAiPrompt(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
        @Body() dto: CreateJobAiPromptDto,
    ) {
        const userId = req.user.id;
        return this.jobService.upsertJobAiPrompt(userId, id, dto);
    }

}