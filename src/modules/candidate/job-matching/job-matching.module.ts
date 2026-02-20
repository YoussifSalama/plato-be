import { Module } from '@nestjs/common';
import { JobMatchingController } from './job-matching.controller';
import { JobMatchingService } from './job-matching.service';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { OpenAiService } from 'src/shared/services/openai.service';

@Module({
    controllers: [JobMatchingController],
    providers: [JobMatchingService, JwtService, OpenAiService],
    imports: [PrismaModule]
})
export class JobMatchingModule { }
