import { Test, TestingModule } from '@nestjs/testing';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { ElevenLabsService } from './elevenlabs.service';

describe('InterviewController', () => {
  let controller: InterviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewController],
      providers: [
        { provide: InterviewService, useValue: {} },
        { provide: ElevenLabsService, useValue: {} },
      ],
    })
      .overrideGuard(CandidateJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InterviewController>(InterviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
