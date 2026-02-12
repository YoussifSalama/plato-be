import { Module } from '@nestjs/common';
import { CandidateResumeController } from './candidate-resume.controller';
import { CandidateResumeService } from './candidate-resume.service';
import { ResumeParserService } from 'src/shared/helpers/modules/agency/resume/resume.helper';

import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';

@Module({
    imports: [PrismaModule],
    controllers: [CandidateResumeController],
    providers: [CandidateResumeService, ResumeParserService, JwtService],
})
export class CandidateResumeModule { }
