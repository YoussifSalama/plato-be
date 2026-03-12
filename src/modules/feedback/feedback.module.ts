import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, JwtService, JwtAuthGuard, CandidateJwtAuthGuard],
  exports: [FeedbackService],
})
export class FeedbackModule {}
