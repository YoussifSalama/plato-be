import { Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";
import { AccessTokenPayload } from "src/shared/types/services/jwt.types";
import { InboxService } from "./inbox.service";
import { GetInboxDto } from "./dto/get-inbox.dto";

@ApiTags("Agency Inbox")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("agency/inbox")
export class InboxController {
    constructor(private readonly inboxService: InboxService) { }

    @Get()
    @ApiOperation({ summary: "Get inbox items" })
    async getInboxes(@Req() req: { user: AccessTokenPayload }, @Query() query: GetInboxDto) {
        return this.inboxService.getInboxes(req.user.id, query);
    }

    @Get("agency")
    @ApiOperation({ summary: "Get agency id for inbox" })
    async getInboxAgency(@Req() req: { user: AccessTokenPayload }) {
        return this.inboxService.getInboxAgency(req.user.id);
    }

    @Patch(":id/archive")
    @ApiOperation({ summary: "Archive inbox item" })
    async archiveInbox(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
    ) {
        return this.inboxService.archiveInbox(req.user.id, id);
    }

    @Patch(":id/unarchive")
    @ApiOperation({ summary: "Unarchive inbox item" })
    async unarchiveInbox(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
    ) {
        return this.inboxService.unarchiveInbox(req.user.id, id);
    }

    @Patch(":id/read")
    @ApiOperation({ summary: "Mark inbox item as read" })
    async markInboxRead(
        @Req() req: { user: AccessTokenPayload },
        @Param("id", ParseIntPipe) id: number,
    ) {
        return this.inboxService.markInboxRead(req.user.id, id);
    }
}

