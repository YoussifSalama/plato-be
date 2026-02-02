import { ResumeFileTypes } from "@generated/prisma";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";

export interface ArrangedSavedResume {
    id: number;
    name: string;
    file_type: ResumeFileTypes;
    link: string;
}

@Injectable()
export class ResumeProducer {
    private readonly logger = new Logger(ResumeProducer.name);
    constructor(
        @InjectQueue('resume_queue')
        private readonly resumeQueue: Queue,
    ) { }

    async processResumes(arrangedSavedResumes: ArrangedSavedResume[], jobId: number) {
        try {
            this.logger.log(`Queueing ${arrangedSavedResumes.length} resume(s) for processing.`);
            await this.resumeQueue.add('process-resumes', {
                arrangedSavedResumes,
                jobId,
            }, {
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: true,
                removeOnFail: false,
            });
        } catch (error) {
            this.logger.error('Failed to enqueue resume processing job.', error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
}
