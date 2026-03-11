import { Test, TestingModule } from '@nestjs/testing';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { CandidateResumeController } from './candidate-resume.controller';
import { CandidateResumeService } from './candidate-resume.service';

describe('CandidateResumeController', () => {
  let controller: CandidateResumeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateResumeController],
      providers: [{ provide: CandidateResumeService, useValue: {} }],
    })
      .overrideGuard(CandidateJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CandidateResumeController>(CandidateResumeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
