import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { CandidateNotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, CandidateNotificationModule],
  controllers: [ProfileController],
  providers: [ProfileService, JwtService, CandidateJwtAuthGuard]
})
export class ProfileModule { }
