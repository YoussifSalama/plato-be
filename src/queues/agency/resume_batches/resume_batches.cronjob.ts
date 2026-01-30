import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";

@Injectable()
export class ResumeBatchesCronJob implements OnModuleInit {
    constructor(@InjectQueue("resume_batches_pull_queue") private readonly queue: Queue) { }

    onModuleInit() {
        this.queue.add("resume_batch_pull_job", {}, {
            repeat: {
                pattern: "*/1 * * * *",
            },
            removeOnComplete: true,
            jobId: "resume_batch_pull_job"
        })
    }
}