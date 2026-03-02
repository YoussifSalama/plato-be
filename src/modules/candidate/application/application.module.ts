import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { InboxModule } from 'src/modules/agency/inbox/inbox.module';
import { ResumeQueueModule } from 'src/queues/agency/resume/resume.module';
import { CandidateNotificationModule } from '../notification/notification.module';

import { PaginationHelper } from 'src/shared/helpers/features/pagination';

@Module({
    imports: [PrismaModule, InboxModule, ResumeQueueModule, CandidateNotificationModule],
    controllers: [ApplicationController],
    providers: [ApplicationService, JwtService, CandidateJwtAuthGuard, PaginationHelper],
})
export class ApplicationModule { }

