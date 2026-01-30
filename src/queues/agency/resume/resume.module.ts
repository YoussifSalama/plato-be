import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ResumeProducer } from './resume.producer';
import { ResumeWorker } from './resume.worker';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ResumeParserService } from 'src/shared/helpers/modules/agency/resume/resume.helper';


@Module({
  imports: [
    BullModule.registerQueue({
      name: 'resume_queue'
    })
  ],
  providers: [ResumeProducer, ResumeWorker, ResumeParserService, PrismaService],
  exports: [ResumeProducer]
})
export class ResumeQueueModule { }