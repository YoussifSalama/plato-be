import { Module } from '@nestjs/common';
import { JobMatchingController } from './job-matching.controller';
import { JobMatchingService } from './job-matching.service';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';

@Module({
    controllers: [JobMatchingController],
    providers: [JobMatchingService, JwtService],
    imports: [PrismaModule]
})
export class JobMatchingModule { }
