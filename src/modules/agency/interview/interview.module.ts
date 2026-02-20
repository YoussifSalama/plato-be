import { Module } from "@nestjs/common";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { PaginationHelper } from "src/shared/helpers/features/pagination";
import { JwtService } from "src/shared/services/jwt.services";
import { AgencyInterviewController } from "./interview.controller";
import { AgencyInterviewService } from "./interview.service";
import { OpenAiService } from "src/shared/services/openai.service";

@Module({
    imports: [PrismaModule],
    controllers: [AgencyInterviewController],
    providers: [AgencyInterviewService, PaginationHelper, JwtService, JwtAuthGuard,OpenAiService],
})
export class AgencyInterviewModule { }

