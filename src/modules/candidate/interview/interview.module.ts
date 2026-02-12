import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

@Module({
  imports: [PrismaModule],
  controllers: [InterviewController],
  providers: [InterviewService, JwtService, CandidateJwtAuthGuard]
})
export class InterviewModule {}
