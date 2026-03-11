import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { InvitationService } from './invitation.service';

describe('InvitationService', () => {
  let service: InvitationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: PrismaService, useValue: {} },
        { provide: RandomUuidService, useValue: {} },
        { provide: SendGridService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
