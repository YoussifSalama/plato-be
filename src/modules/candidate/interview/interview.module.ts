import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { SpeechModule } from 'src/modules/speech/speech.module';
import { InterviewGateway } from 'src/gateways/candidate/interview/interview.gateway';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import { InboxModule } from 'src/modules/agency/inbox/inbox.module';

@Module({
  imports: [PrismaModule, SpeechModule, InboxModule],
  controllers: [InterviewController],
  providers: [InterviewService, InterviewGateway, JwtService, CandidateJwtAuthGuard, PaginationHelper]
})
export class InterviewModule { }
