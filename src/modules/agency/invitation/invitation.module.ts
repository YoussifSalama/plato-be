import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { EmailModule } from 'src/shared/services/email.module';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { JwtService } from 'src/shared/services/jwt.services';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [InvitationController],
  providers: [InvitationService, RandomUuidService, JwtService, JwtAuthGuard],
  exports: [InvitationService],
})
export class InvitationModule { }
