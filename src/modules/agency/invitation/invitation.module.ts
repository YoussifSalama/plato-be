import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { MailGunService } from 'src/shared/services/mailgun.services';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { JwtService } from 'src/shared/services/jwt.services';
import { RandomUuidServie } from 'src/shared/services/randomuuid.services';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationController],
  providers: [InvitationService, RandomUuidServie, MailGunService, JwtService, JwtAuthGuard],
  exports: [InvitationService],
})
export class InvitationModule { }
