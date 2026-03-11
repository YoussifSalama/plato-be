import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ResumeProducer } from 'src/queues/agency/resume/resume.producer';
import { FilterHelper } from 'src/shared/helpers/features/filter';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import { InvitationService } from 'src/modules/agency/invitation/invitation.service';
import { AiCallProducer } from 'src/queues/agency/ai-call/ai-call.producer';
import { OpenAiService } from 'src/shared/services/openai.service';
import { ResumeService } from './resume.service';

describe('ResumeService', () => {
  let service: ResumeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: ResumeProducer, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: FilterHelper, useValue: {} },
        { provide: PaginationHelper, useValue: {} },
        { provide: InvitationService, useValue: {} },
        { provide: AiCallProducer, useValue: {} },
        { provide: OpenAiService, useValue: {} },
      ],
    }).compile();

    service = module.get<ResumeService>(ResumeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
