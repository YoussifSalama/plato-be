import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

describe('AgencyController', () => {
  let controller: AgencyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgencyController],
      providers: [
        { provide: AgencyService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AgencyController>(AgencyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
