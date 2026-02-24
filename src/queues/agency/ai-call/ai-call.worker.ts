import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TwilioVoiceService } from 'src/shared/services/twilio-voice.service';
import { AiCallJobData } from './ai-call.producer';

@Processor('ai_voice_calls')
@Injectable()
export class AiCallWorker extends WorkerHost {
  private readonly logger = new Logger(AiCallWorker.name);

  constructor(private readonly twilioVoiceService: TwilioVoiceService) {
    super();
  }

  async process(job: Job<AiCallJobData>): Promise<void> {
    const data = job.data;
    this.logger.log(
      `Processing AI voice call job ${job.id} for resume=${data.resumeId}, job=${data.jobId}, phone=${data.toPhoneNumber}`,
    );

    try {
      await this.twilioVoiceService.initiateInterviewReminderCall({
        toPhoneNumber: data.toPhoneNumber,
        candidateName: data.candidateName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
      });
    } catch (error) {
      this.logger.error(
        `AI voice call job ${job.id} failed`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

