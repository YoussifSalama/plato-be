import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export interface AiCallJobData {
  resumeId: number;
  jobId: number | null;
  agencyId: number;
  toPhoneNumber: string;
  candidateName?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
}

@Injectable()
export class AiCallProducer {
  private readonly logger = new Logger(AiCallProducer.name);

  constructor(
    @InjectQueue('ai_voice_calls')
    private readonly queue: Queue<AiCallJobData>,
  ) {}

  async scheduleInterviewReminderCall(
    data: AiCallJobData,
    delayMs: number,
  ): Promise<void> {
    this.logger.log(
      `Scheduling AI voice call for resume=${data.resumeId}, job=${data.jobId}, delayMs=${delayMs}`,
    );

    await this.queue.add('interview-call-reminder', data, {
      delay: Math.max(0, delayMs),
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
      backoff: {
        type: 'exponential',
        delay: 5_000,
      },
    });
  }
}

