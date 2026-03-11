import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SpeechService } from 'src/modules/speech/speech.service';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import { InboxService } from 'src/modules/agency/inbox/inbox.service';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { CandidateNotificationService } from '../notification/notification.service';
import { InterviewService } from './interview.service';

describe('InterviewService', () => {
  let service: InterviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewService,
        { provide: PrismaService, useValue: {} },
        { provide: SpeechService, useValue: {} },
        { provide: PaginationHelper, useValue: {} },
        { provide: InboxService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => (key === 'env.openai.keys' ? [{ apiKey: 'test' }] : undefined)) },
        },
        { provide: SendGridService, useValue: {} },
        { provide: RandomUuidService, useValue: {} },
        { provide: CandidateNotificationService, useValue: {} },
        { provide: getQueueToken('candidate_interview_generated_profile'), useValue: {} },
      ],
    }).compile();

    service = module.get<InterviewService>(InterviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
