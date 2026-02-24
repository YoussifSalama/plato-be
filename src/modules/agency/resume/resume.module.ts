import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ResumeQueueModule } from 'src/queues/agency/resume/resume.module';
import { InvitationModule } from 'src/modules/agency/invitation/invitation.module';
import { FilterHelper } from 'src/shared/helpers/features/filter';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import { JwtService } from 'src/shared/services/jwt.services';
import { OpenAiService } from 'src/shared/services/openai.service';
import { AiCallModule } from 'src/queues/agency/ai-call/ai-call.module';

@Module({
  imports: [ResumeQueueModule, InvitationModule, AiCallModule],
  controllers: [ResumeController],
  providers: [ResumeService, PrismaService, FilterHelper, PaginationHelper, JwtService, OpenAiService],
})
export class ResumeModule { }
