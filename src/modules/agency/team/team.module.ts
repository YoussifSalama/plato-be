import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { RandomUuidService } from 'src/shared/services/randomuuid.services';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SendGridService } from 'src/shared/services/sendgrid.services';
import { JwtService } from 'src/shared/services/jwt.services';


@Module({
  controllers: [TeamController],
  providers: [TeamService, RandomUuidService, PrismaService, SendGridService, JwtService],
})
export class TeamModule { }
