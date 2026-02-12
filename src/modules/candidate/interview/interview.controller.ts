import { Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CandidateJwtAuthGuard } from "src/shared/guards/candidate-jwt-auth.guard";
import { AccessTokenPayload } from "src/shared/types/services/jwt.types";
import { InterviewService } from "./interview.service";

@ApiTags("Interview")
@Controller("interview")
export class InterviewController {
    constructor(private readonly interviewService: InterviewService) { }

    @Get()
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "List candidate interviews" })
    @ApiQuery({ name: "page", required: false, example: 1 })
    @ApiQuery({ name: "limit", required: false, example: 10 })
    @ApiQuery({
        name: "sortBy",
        required: false,
        schema: { type: "string", enum: ["created_at", "expires_at"] },
        example: "expires_at",
    })
    @ApiQuery({
        name: "sortOrder",
        required: false,
        schema: { type: "string", enum: ["asc", "desc"] },
        example: "desc",
    })
    @ApiQuery({
        name: "status",
        required: false,
        schema: { type: "string", enum: ["active", "expired", "revoked", "all"] },
        example: "active",
    })
    @ApiQuery({
        name: "search",
        required: false,
        schema: { type: "string" },
        example: "frontend",
    })
    async listCandidateInterviews(
        @Req() req: { user: AccessTokenPayload },
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("sortBy") sortBy?: "created_at" | "expires_at",
        @Query("sortOrder") sortOrder?: "asc" | "desc",
        @Query("status") status?: "active" | "expired" | "revoked" | "all",
        @Query("search") search?: string
    ) {
        return this.interviewService.listCandidateInterviews(req.user.id, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy,
            sortOrder,
            status,
            search,
        });
    }

    @Post("resources/:token")
    @ApiOperation({ summary: "Create interview resources from invitation token" })
    @ApiParam({ name: "token", example: "invitation-token" })
    @ApiQuery({
        name: "language",
        required: true,
        schema: { type: "string", enum: ["ar", "en"] },
        example: "ar",
    })
    async createInterviewResources(
        @Param("token") token: string,
        @Query("language") language: "ar" | "en"
    ) {
        const selectedLanguage = language === "en" ? "en" : "ar";
        return this.interviewService.createInterviewResources(token, selectedLanguage);
    }
}