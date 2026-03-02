import { Module } from "@nestjs/common";
import { CandidateNotificationGateway } from "./notification.gateway";
import { CandidateNotificationService } from "./notification.service";
import { CandidateNotificationController } from "./notification.controller";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { JwtService } from "src/shared/services/jwt.services";

@Module({
    imports: [PrismaModule],
    controllers: [CandidateNotificationController],
    providers: [CandidateNotificationGateway, CandidateNotificationService, JwtService],
    exports: [CandidateNotificationService],
})
export class CandidateNotificationModule { }
