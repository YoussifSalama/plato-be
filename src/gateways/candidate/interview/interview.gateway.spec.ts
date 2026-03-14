import { Test, TestingModule } from '@nestjs/testing';
import { InterviewGateway } from './interview.gateway';
import { InterviewService } from 'src/modules/candidate/interview/interview.service';
import { SpeechService } from 'src/modules/speech/speech.service';

describe('InterviewGateway', () => {
  let gateway: InterviewGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewGateway,
        { provide: InterviewService, useValue: {} },
        { provide: SpeechService, useValue: {} },
      ],
    }).compile();

    gateway = module.get<InterviewGateway>(InterviewGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
