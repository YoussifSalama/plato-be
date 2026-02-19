import { Module } from '@nestjs/common';
import { AgencyApplicationController } from './application.controller';
import { AgencyApplicationService } from './application.service';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { JwtService } from 'src/shared/services/jwt.services';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';

@Module({
    imports: [PrismaModule],
    controllers: [AgencyApplicationController],
    providers: [AgencyApplicationService, JwtService, JwtAuthGuard],
})
export class AgencyApplicationModule { }
