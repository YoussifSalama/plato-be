import { Controller, Get, Patch, Param, UseGuards, Req, Query, ParseIntPipe } from "@nestjs/common";
import { CandidateNotificationService } from "./notification.service";
import { CandidateJwtAuthGuard } from "src/shared/guards/candidate-jwt-auth.guard";
import { Request } from "express";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Candidate Notifications")
@ApiBearerAuth()
@Controller('candidate/notification')
@UseGuards(CandidateJwtAuthGuard)
export class CandidateNotificationController {
    constructor(private readonly notificationService: CandidateNotificationService) { }

    @Get()
    @ApiOperation({ summary: "Get candidate notifications", description: "Retrieve paginated inbox notifications for the authenticated candidate." })
    @ApiQuery({ name: "page", required: false, type: String, description: "Page number (default: 1)" })
    @ApiQuery({ name: "limit", required: false, type: String, description: "Items per page (default: 10)" })
    @ApiQuery({ name: "status", required: false, type: String, description: "Filter by status (unread, read, archived)" })
    @ApiQuery({ name: "type", required: false, type: String, description: "Filter by notification type" })
    @ApiQuery({ name: "sort_by", required: false, type: String, description: "Field to sort by (default: created_at)" })
    @ApiQuery({ name: "sort_order", required: false, type: String, description: "Sort order (asc | desc) (default: desc)" })
    @ApiResponse({ status: 200, description: "List of notifications retrieved successfully." })
    async getNotifications(
        @Req() req: Request,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('sort_by') sort_by?: string,
        @Query('sort_order') sort_order?: string
    ) {
        const candidateId = (req as any).user['id'];
        return this.notificationService.listInbox(
            candidateId,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
            status,
            type,
            sort_by || 'created_at',
            sort_order || 'desc'
        );
    }

    @Patch('read-all')
    @ApiOperation({ summary: "Mark all notifications as read", description: "Marks all unread inbox items as read for the authenticated candidate." })
    @ApiResponse({ status: 200, description: "All notifications marked as read." })
    async markAllAsRead(@Req() req: Request) {
        const candidateId = (req as any).user['id'];
        return this.notificationService.markAllAsRead(candidateId);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: "Mark notification as read", description: "Marks a specific inbox item as read by its ID." })
    @ApiParam({ name: "id", type: Number, description: "The ID of the notification to mark as read" })
    @ApiResponse({ status: 200, description: "Notification marked as read successfully." })
    async markAsRead(
        @Req() req: Request,
        @Param('id', ParseIntPipe) id: number
    ) {
        const candidateId = (req as any).user['id'];
        return this.notificationService.markAsRead(candidateId, id);
    }

    @Patch(':id/archive')
    @ApiOperation({ summary: "Archive notification", description: "Marks a specific inbox item as archived by its ID." })
    @ApiParam({ name: "id", type: Number, description: "The ID of the notification to archive" })
    @ApiResponse({ status: 200, description: "Notification archived successfully." })
    async archive(
        @Req() req: Request,
        @Param('id', ParseIntPipe) id: number
    ) {
        const candidateId = (req as any).user['id'];
        return this.notificationService.archiveInbox(candidateId, id);
    }
}
