import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { InboxEventsService } from './inbox.events.service';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import { InboxService } from './inbox.service';

describe('InboxService', () => {
  let service: InboxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: PrismaService, useValue: {} },
        { provide: InboxEventsService, useValue: {} },
        { provide: PaginationHelper, useValue: {} },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
