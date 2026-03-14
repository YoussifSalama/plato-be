import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { CandidateOrSessionJwtAuthGuard } from 'src/shared/guards/candidate-or-session-jwt-auth.guard';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { ElevenLabsService } from './elevenlabs.service';
import { SpeechModule } from 'src/modules/speech/speech.module';
import { InterviewGateway } from 'src/gateways/candidate/interview/interview.gateway';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import { InboxModule } from 'src/modules/agency/inbox/inbox.module';
import { OpenAiService } from 'src/shared/services/openai.service';
import { EmailModule } from 'src/shared/services/email.module';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { CandidateGeneratedProfileWorker } from './interview.generated-profile.worker';
import { CandidateNotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    SpeechModule,
    InboxModule,
    EmailModule,
    CandidateNotificationModule,
    BullModule.registerQueue({
      name: 'candidate_interview_generated_profile',
    }),
  ],
  controllers: [InterviewController],
    providers: [
    InterviewService,
    ElevenLabsService,
    InterviewGateway,
    JwtService,
    CandidateJwtAuthGuard,
    CandidateOrSessionJwtAuthGuard,
    PaginationHelper,
    OpenAiService,
    RandomUuidService,
    CandidateGeneratedProfileWorker,
  ],
})
export class InterviewModule { }
