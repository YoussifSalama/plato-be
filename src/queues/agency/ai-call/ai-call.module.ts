import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { AiCallProducer } from './ai-call.producer';
import { AiCallWorker } from './ai-call.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai_voice_calls',
    }),
  ],
  providers: [AiCallWorker, AiCallProducer, PrismaService],
  exports: [AiCallProducer],
})
export class AiCallModule {}

