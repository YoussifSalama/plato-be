import { Module } from "@nestjs/common";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { InboxService } from "./inbox.service";
import { InboxGateway } from "./inbox.gateway";
import { InboxEventsService } from "./inbox.events.service";
import { InboxController } from "./inbox.controller";
import { PaginationHelper } from "src/shared/helpers/features/pagination";
import { JwtService } from "src/shared/services/jwt.services";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";

@Module({
    imports: [PrismaModule],
    controllers: [InboxController],
    providers: [InboxService, InboxGateway, InboxEventsService, PaginationHelper, JwtService, JwtAuthGuard],
    exports: [InboxService, InboxEventsService],
})
export class InboxModule { }

