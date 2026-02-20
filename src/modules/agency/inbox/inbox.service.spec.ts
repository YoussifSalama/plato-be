
import { Test, TestingModule } from '@nestjs/testing';
import { InboxService } from './inbox.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { InboxEventsService } from './inbox.events.service';
import { PaginationHelper } from 'src/shared/helpers/features/pagination';
import { InboxType, InboxStatus, InboxSeverity, InterviewSessionStatus } from '@generated/prisma';

describe('InboxService', () => {
    let service: InboxService;
    let prisma: PrismaService;
    let inboxEvents: InboxEventsService;

    const mockPrismaService = {
        inbox: {
            create: jest.fn(),
        },
    };

    const mockInboxEventsService = {
        emitInboxCreated: jest.fn(),
    };

    const mockPaginationHelper = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InboxService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: InboxEventsService, useValue: mockInboxEventsService },
                { provide: PaginationHelper, useValue: mockPaginationHelper },
            ],
        }).compile();

        service = module.get<InboxService>(InboxService);
        prisma = module.get<PrismaService>(PrismaService);
        inboxEvents = module.get<InboxEventsService>(InboxEventsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createApplicationInbox', () => {
        it('should create an application inbox notification and emit event', async () => {
            const input = {
                agencyId: 1,
                jobId: 10,
                jobApplicationId: 100,
                candidateName: 'Alice Smith',
                jobTitle: 'Backend Developer',
            };

            const createdInbox = {
                id: 1,
                type: InboxType.application,
                status: InboxStatus.unread,
                severity: InboxSeverity.info,
                title: `New Application: ${input.candidateName}`,
                description: `${input.candidateName} has applied for ${input.jobTitle}.`,
                agency_id: input.agencyId,
                job_id: input.jobId,
                job_application_id: input.jobApplicationId,
                created_at: new Date(),
            };

            jest.spyOn(prisma.inbox, 'create').mockResolvedValue(createdInbox as any);

            await service.createApplicationInbox(input);

            expect(prisma.inbox.create).toHaveBeenCalledWith({
                data: {
                    type: InboxType.application,
                    status: InboxStatus.unread,
                    severity: InboxSeverity.info,
                    title: createdInbox.title,
                    description: createdInbox.description,
                    agency_id: input.agencyId,
                    job_id: input.jobId,
                    job_application_id: input.jobApplicationId,
                },
            });

            expect(inboxEvents.emitInboxCreated).toHaveBeenCalledWith(input.agencyId, expect.objectContaining({
                id: createdInbox.id,
                title: createdInbox.title,
            }));
        });
    });

    describe('createInterviewInbox', () => {
        it('should create an interview inbox notification for started status', async () => {
            const input = {
                agencyId: 1,
                jobId: 10,
                interviewSessionId: 200,
                status: InterviewSessionStatus.active,
                candidateName: 'Bob Jones',
                jobTitle: 'Manager',
            };

            const createdInbox = {
                id: 2,
                type: InboxType.interview,
                status: InboxStatus.unread,
                severity: InboxSeverity.info,
                title: `Interview Started: ${input.candidateName}`,
                description: `${input.candidateName} has started the interview for ${input.jobTitle}.`,
                agency_id: input.agencyId,
                job_id: input.jobId,
                interview_session_id: input.interviewSessionId,
                created_at: new Date(),
            };

            jest.spyOn(prisma.inbox, 'create').mockResolvedValue(createdInbox as any);

            await service.createInterviewInbox(input);

            expect(prisma.inbox.create).toHaveBeenCalledWith({
                data: {
                    type: InboxType.interview,
                    status: InboxStatus.unread,
                    severity: InboxSeverity.info,
                    title: createdInbox.title,
                    description: createdInbox.description,
                    agency_id: input.agencyId,
                    job_id: input.jobId,
                    interview_session_id: input.interviewSessionId,
                },
            });

            expect(inboxEvents.emitInboxCreated).toHaveBeenCalledWith(input.agencyId, expect.objectContaining({
                id: createdInbox.id,
                title: createdInbox.title,
            }));
        });
    });
});
