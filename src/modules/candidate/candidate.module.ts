import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { ProfileModule } from './profile/profile.module';

@Module({
  controllers: [CandidateController],
  providers: [CandidateService],
  imports: [ProfileModule]
})
export class CandidateModule {}
