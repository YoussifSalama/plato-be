import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { CreateJobAiPromptDto } from "./dto/create-job-ai-prompt.dto";
import { JobAiPromptService } from "./job-ai-prompt.service";

@ApiTags("Agency Job AI Prompts")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("agency/job-ai-prompts")
export class JobAiPromptController {
    constructor(private readonly jobAiPromptService: JobAiPromptService) { }

    @Post()
    @ApiOperation({ summary: "Create a job AI prompt" })
    async create(@Body() dto: CreateJobAiPromptDto) {
        return this.jobAiPromptService.createPrompt(dto);
    }

    @Patch(":id/activate")
    @ApiOperation({ summary: "Activate a job AI prompt" })
    async activate(@Param("id", ParseIntPipe) id: number) {
        return this.jobAiPromptService.activatePrompt(id);
    }

    @Patch(":id/inactivate")
    @ApiOperation({ summary: "Inactivate a job AI prompt" })
    async inactivate(@Param("id", ParseIntPipe) id: number) {
        return this.jobAiPromptService.inactivatePrompt(id);
    }
}

