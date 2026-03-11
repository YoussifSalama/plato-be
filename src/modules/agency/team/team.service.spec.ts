import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { TeamService } from './team.service';

describe('TeamService', () => {
  let service: TeamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: {} },
        { provide: RandomUuidService, useValue: {} },
        { provide: SendGridService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
