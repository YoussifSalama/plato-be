import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ResumeBatchesWorker } from "./resume_batches.worker";
import { ResumeBatchesCronJob } from "./resume_batches.cronjob";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { InvitationModule } from "src/modules/agency/invitation/invitation.module";
import { InboxModule } from "src/modules/agency/inbox/inbox.module";
import { OpenAiService } from "src/shared/services/openai.service";

@Module({
    imports: [
        BullModule.registerQueue({
            name: "resume_batches_pull_queue"
        }),
        InvitationModule,
        InboxModule,
    ],
    providers: [ResumeBatchesWorker, ResumeBatchesCronJob, PrismaService,OpenAiService],
    exports: [ResumeBatchesWorker, ResumeBatchesCronJob]
})
export class ResumeBatchesModule { }