import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import envConfig from "./shared/config/env/env.config";
import loadEnv from "./shared/helpers/loadenv";
import { BullModule } from "@nestjs/bullmq";
import { ResumeQueueModule } from "./queues/agency/resume/resume.module";
import { ResumeModule } from "./modules/agency/resume/resume.module";
import redisConnection from "./shared/redis/redis.connection";
import { ResumeBatchesModule } from "./queues/agency/resume_batches/resume_batches.module";
import { AgencyModule } from './modules/agency/agency/agency.module';
import { JobModule } from "./modules/agency/job/job.module";
import { InvitationModule } from './modules/agency/invitation/invitation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: loadEnv(),
    }),
    BullModule.forRoot({
      connection: redisConnection
    }),
    ResumeQueueModule,
    ResumeBatchesModule,
    ResumeModule,
    AgencyModule,
    JobModule,
    InvitationModule,
  ],
})
export class AppModule { }
