import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ResumeModule } from "./modules/agency/resume/resume.module";
import { AgencyModule } from "./modules/agency/agency/agency.module";
import { JobModule } from "./modules/agency/job/job.module";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(join(process.cwd(), "uploads"), {
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
    include: [ResumeModule, AgencyModule, JobModule],
  });
  SwaggerModule.setup('api/agency', app, agencyDocument);


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();