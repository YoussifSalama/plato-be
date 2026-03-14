import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';

describe('ResumeController', () => {
  let controller: ResumeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeController],
      providers: [{ provide: ResumeService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ResumeController>(ResumeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
