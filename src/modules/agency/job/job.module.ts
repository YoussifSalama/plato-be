import { Module } from "@nestjs/common";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { PaginationHelper } from "src/shared/helpers/features/pagination";
import { JwtService } from "src/shared/services/jwt.services";
import { JobAiPromptController } from "./job-ai-prompt.controller";
import { JobAiPromptService } from "./job-ai-prompt.service";
import { JobController } from "./job.controller";
import { JobService } from "./job.service";

@Module({
    imports: [PrismaModule],
    controllers: [JobController, JobAiPromptController],
    providers: [JobService, JobAiPromptService, PaginationHelper, JwtService, JwtAuthGuard],
})
export class JobModule { }

