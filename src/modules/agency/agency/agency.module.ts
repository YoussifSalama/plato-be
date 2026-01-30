import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { BcryptService } from 'src/shared/services/bcrypt.services';
import { MailGunService } from 'src/shared/services/mailgun.services';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { JwtService } from 'src/shared/services/jwt.services';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgencyController],
  providers: [AgencyService, BcryptService, MailGunService, JwtService, JwtAuthGuard],
})
export class AgencyModule { }
