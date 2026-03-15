import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';

@Module({
    imports: [PrismaModule],
    providers: [DocumentService, JwtService, CandidateJwtAuthGuard],
    controllers: [DocumentController],
})
export class DocumentModule {}
