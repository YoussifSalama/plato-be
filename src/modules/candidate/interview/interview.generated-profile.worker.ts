import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InterviewService } from './interview.service';

type CandidateGeneratedProfileJobData = {
  interviewSessionId: number;
};

@Processor('candidate_interview_generated_profile')
@Injectable()
export class CandidateGeneratedProfileWorker extends WorkerHost {
  private readonly logger = new Logger(CandidateGeneratedProfileWorker.name);

  constructor(private readonly interviewService: InterviewService) {
    super();
  }

  async process(job: Job<CandidateGeneratedProfileJobData>): Promise<void> {
    const interviewSessionId = Number(job.data?.interviewSessionId);
    if (!Number.isFinite(interviewSessionId) || interviewSessionId <= 0) {
      this.logger.warn(`Skipping invalid generated profile job ${job.id}`);
      return;
    }
    this.logger.log(`Processing generated profile for session=${interviewSessionId}`);
    await this.interviewService.processGeneratedProfile(interviewSessionId);
  }
}
