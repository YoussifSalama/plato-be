import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { ProfileModule } from './profile/profile.module';
import { JobMatchingModule } from './job-matching/job-matching.module';

@Module({
  controllers: [CandidateController],
  providers: [CandidateService],
  imports: [ProfileModule, JobMatchingModule]
})
export class CandidateModule { }
