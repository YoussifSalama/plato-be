import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';

@Module({
    imports: [PrismaModule],
    controllers: [ApplicationController],
    providers: [ApplicationService, JwtService, CandidateJwtAuthGuard],
})
export class ApplicationModule { }
