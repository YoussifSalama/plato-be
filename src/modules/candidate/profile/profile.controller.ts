import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Put,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from "multer";
import { ensureUploadsDir } from "src/shared/helpers/storage/uploads-path";
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';
import {
    UpdateProfileBasicDto,
    UpdateProfileExperiencesDto,
    UpdateProfileProjectsDto,
    UpdateProfileSocialLinksDto,
} from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

const getCandidateAvatarFolder = () => ensureUploadsDir("candidate/avatar");

@ApiTags("Profile")
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get("me")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "Get current candidate profile" })
    async getProfile(@Req() req: { user: AccessTokenPayload }) {
        return this.profileService.getProfile(req.user.id);
    }

    @Put("basic")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "Update basic profile info" })
    async updateBasic(
        @Req() req: { user: AccessTokenPayload },
        @Body() dto: UpdateProfileBasicDto,
    ) {
        return this.profileService.updateBasic(req.user.id, dto);
    }

    @Put("experiences")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "Replace profile experiences" })
    async replaceExperiences(
        @Req() req: { user: AccessTokenPayload },
        @Body() dto: UpdateProfileExperiencesDto,
    ) {
        return this.profileService.replaceExperiences(req.user.id, dto.experiences ?? []);
    }

    @Put("projects")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "Replace profile projects" })
    async replaceProjects(
        @Req() req: { user: AccessTokenPayload },
        @Body() dto: UpdateProfileProjectsDto,
    ) {
        return this.profileService.replaceProjects(req.user.id, dto.projects ?? []);
    }

    @Put("social-links")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "Replace profile social links" })
    async replaceSocialLinks(
        @Req() req: { user: AccessTokenPayload },
        @Body() dto: UpdateProfileSocialLinksDto,
    ) {
        return this.profileService.replaceSocialLinks(req.user.id, dto.social_links ?? []);
    }

    @Post("avatar")
    @ApiBearerAuth("access-token")
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: "Upload profile avatar" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary" },
            },
            required: ["file"],
        },
    })
    @UseInterceptors(
        FileInterceptor("file", {
            storage: diskStorage({
                destination: (req, file, callback) => {
                    callback(null, getCandidateAvatarFolder());
                },
                filename: (req, file, callback) => {
                    const originalName = file?.originalname ?? "avatar";
                    callback(null, `${Date.now()}-candidate-avatar-${originalName}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (file.mimetype?.startsWith("image/")) {
                    callback(null, true);
                } else {
                    callback(new BadRequestException("Avatar must be an image file."), false);
                }
            },
            limits: {
                fileSize: 5 * 1024 * 1024,
            },
        })
    )
    async uploadAvatar(
        @Req() req: { user: AccessTokenPayload },
        @UploadedFile() file: any,
    ) {
        return this.profileService.updateAvatar(req.user.id, file);
    }
}
