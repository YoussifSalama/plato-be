import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

describe('InvitationController', () => {
  let controller: InvitationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [{ provide: InvitationService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvitationController>(InvitationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
