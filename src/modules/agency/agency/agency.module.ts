import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { BcryptService } from 'src/shared/services/bcrypt.services';
import { EmailModule } from 'src/shared/services/email.module';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { JwtService } from 'src/shared/services/jwt.services';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [AgencyController],
  providers: [AgencyService, BcryptService, JwtService, JwtAuthGuard],
})
export class AgencyModule { }
