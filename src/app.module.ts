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
import { InboxModule } from "./modules/agency/inbox/inbox.module";
import { AgencyInterviewModule } from "./modules/agency/interview/interview.module";
import { CandidateModule } from "./modules/candidate/candidate/candidate.module";
import { RedisModule } from "./modules/redis/redis.module";
import { InterviewModule } from './modules/candidate/interview/interview.module';
import { SpeechModule } from "./modules/speech/speech.module";
import { ProfileModule } from "./modules/candidate/profile/profile.module";
import { TeamModule } from './modules/agency/team/team.module';
import { SharedModule } from "./shared/shared.module";
import { AiCallModule } from "./queues/agency/ai-call/ai-call.module";
import { StripeModule } from "./modules/stripe/stripe.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";
import { S3Client } from '@aws-sdk/client-s3';
import { AwsSdkModule } from 'aws-sdk-v3-nest';

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
    AwsSdkModule.register({
      client: new S3Client({
        region: process.env.AWS_S3_REGION ?? 'eu-central-1',
        credentials: {
          accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? '',
        },
      }),
      isGlobal: true,
    }),
    ResumeQueueModule,
    ResumeBatchesModule,
    AiCallModule,
    ResumeModule,
    AgencyModule,
    JobModule,
    InvitationModule,
    InboxModule,
    AgencyInterviewModule,
    CandidateModule,
    RedisModule,
    InterviewModule,
    SpeechModule,
    ProfileModule,
    TeamModule,
    SharedModule,
    StripeModule,
    FeedbackModule,
  ],
  providers: [],
})
export class AppModule { }
