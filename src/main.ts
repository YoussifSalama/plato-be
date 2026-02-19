import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ResumeModule } from "./modules/agency/resume/resume.module";
import { AgencyModule } from "./modules/agency/agency/agency.module";
import { JobModule } from "./modules/agency/job/job.module";
import { InvitationModule } from "./modules/agency/invitation/invitation.module";
import { InboxModule } from "./modules/agency/inbox/inbox.module";
import { CandidateModule } from "./modules/candidate/candidate/candidate.module";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";
import { RedisIoAdapter } from "./shared/websocket/redis-io.adapter";
import { ensureUploadsDir } from "./shared/helpers/storage/uploads-path";
import { InterviewModule } from "./modules/candidate/interview/interview.module";
import { SpeechModule } from "./modules/speech/speech.module";
import { CandidateResumeModule } from "./modules/candidate/resume/candidate-resume.module";
import { JobMatchingModule } from "./modules/candidate/job-matching/job-matching.module";
import { ApplicationModule } from "./modules/candidate/application/application.module";
import { AgencyApplicationModule } from "./modules/agency/application/application.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  if (process.env.WEBSOCKET_REDIS_ADAPTER === "true") {
    const redisPortValue = Number(process.env.REDIS_PORT);
    const redisPort = Number.isFinite(redisPortValue) ? redisPortValue : 6379;
    const redisAdapter = new RedisIoAdapter(app);
    await redisAdapter.connectToRedis({
      host: process.env.REDIS_HOST ?? "127.0.0.1",
      port: redisPort,
      password: process.env.REDIS_PASSWORD ?? undefined,
    });
    app.useWebSocketAdapter(redisAdapter);
  }
  const uploadsDir = ensureUploadsDir();
  app.useStaticAssets(uploadsDir, {
    prefix: "/uploads",
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const bearerAuthConfig = {
    type: 'http' as const,
    scheme: 'bearer',
    bearerFormat: 'JWT',
    name: 'JWT',
    description: 'Enter JWT token',
    in: 'header' as const,
  };
  const tokenName = 'access-token';

  const candidate = new DocumentBuilder()
    .setTitle('Plato Candidate API Documentation')
    .setDescription('Endpoints for candidates.')
    .setVersion('1.0')
    .addBearerAuth(bearerAuthConfig, tokenName)
    .build();

  const candidateDocument = SwaggerModule.createDocument(app, candidate, {
    include: [
      CandidateModule,
      InterviewModule,
      SpeechModule,
      CandidateResumeModule,
      JobMatchingModule,
      ApplicationModule,

    ],
  });
  SwaggerModule.setup('api/candidate', app, candidateDocument);

  const agencyConfig = new DocumentBuilder()
    .setTitle('Plato Agency API Documentation')
    .setDescription('Endpoints for agencies.')
    .setVersion('1.0')
    .addBearerAuth(bearerAuthConfig, tokenName)
    .build();

  const agencyDocument = SwaggerModule.createDocument(app, agencyConfig, {
    include: [
      ResumeModule,
      AgencyModule,
      JobModule,
      InvitationModule,
      InboxModule,
      AgencyApplicationModule
    ],
  });
  SwaggerModule.setup('api/agency', app, agencyDocument);


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();