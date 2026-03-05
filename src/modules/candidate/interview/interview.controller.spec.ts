import { Test, TestingModule } from '@nestjs/testing';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { ElevenLabsService } from './elevenlabs.service';

describe('InterviewController', () => {
  let controller: InterviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewController],
      providers: [
        {
          provide: InterviewService,
          useValue: {
            listCandidateInterviews: jest.fn(),
            createInterviewResources: jest.fn(),
            startInterviewSession: jest.fn(),
            cancelInterviewSession: jest.fn(),
            completeInterviewSession: jest.fn(),
            getGeneratedProfile: jest.fn(),
            postponeInterviewSession: jest.fn(),
            appendQaLogEntry: jest.fn(),
            trackModalDismissed: jest.fn(),
            createRealtimeSession: jest.fn(),
            recordRealtimeMetrics: jest.fn(),
            processElevenLabsPostCallWebhook: jest.fn(),
          },
        },
        {
          provide: ElevenLabsService,
          useValue: {
            getSignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InterviewController>(InterviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
