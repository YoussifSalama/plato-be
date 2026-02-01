import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ensureUploadsDir } from "src/shared/helpers/storage/uploads-path";
import { GetResumesDto } from './dto/get-resumes.dto';
import { GetResumeDetailsDto } from './dto/get-resume-details.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { DenyResumeDto } from './dto/deny-resume.dto';
import { ShortlistResumeDto } from './dto/shortlist-resume.dto';
import { InviteResumeDto } from './dto/invite-resume.dto';

const getResumeFolder = () => {
    return ensureUploadsDir("resumes");
};

@Controller('resume')
export class ResumeController {
    constructor(private readonly resumeService: ResumeService) { }

    @Post('process')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @UseInterceptors(FilesInterceptor('resumes', 1000, {
        storage: diskStorage({
            destination: getResumeFolder(),
            filename: (req, file, callback) => {
                const originalName = file?.originalname ?? 'upload';
                callback(null, `${Date.now()}-uploads-resumes-${originalName}`);
            }
        }),
        fileFilter: (req, file, callback) => {
            const allowedTypes = new Set([
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
            ]);
            if (allowedTypes.has(file.mimetype)) {
                callback(null, true);
            } else {
                callback(new BadRequestException('Invalid file type'), false);
            }
        },
        limits: {
            fileSize: 1024 * 1024 * 5,
        }
    }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        required: true,
        schema: {
            type: 'object',
            properties: {
                resumes: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' }
                },
                job_id: { type: 'number', example: 1 },
            }
        }
    })
    async processResumes(
        @UploadedFiles() resumes: Express.Multer.File[] | undefined,
        @Body('job_id', ParseIntPipe) jobId: number,
        @Req() req: { user?: { id: number } },
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException('Invalid user');
        }
        const files = resumes ?? [];
        if (!files.length) {
            throw new BadRequestException('No files uploaded');
        }
        return this.resumeService.processResumes(files, jobId, userId);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getResumes(@Query() getResumesDto: GetResumesDto, @Req() req: { user?: { id: number } }) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException('Invalid user');
        }
        return this.resumeService.getResumes(getResumesDto, userId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getResume(@Param('id', ParseIntPipe) id: number, @Req() req: { user?: { id: number } }) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException('Invalid user');
        }
        return this.resumeService.getResume(id, userId);
    }

    @Get('single/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getResumeDetails(
        @Req() req: { user?: { id: number } },
        @Param() params: GetResumeDetailsDto,
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException('Invalid user');
        }
        return this.resumeService.getResumeDetails(params.id, userId);
    }

    @Patch(':id/deny')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async denyResume(
        @Req() req: { user?: { id: number } },
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: DenyResumeDto,
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException('Invalid user');
        }
        return this.resumeService.denyResume(id, userId, dto);
    }

    @Patch(':id/shortlist')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async shortlistResume(
        @Req() req: { user?: { id: number } },
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ShortlistResumeDto,
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException('Invalid user');
        }
        return this.resumeService.shortlistResume(id, userId, dto);
    }

    @Post(':id/invite')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async inviteResume(
        @Req() req: { user?: { id: number } },
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: InviteResumeDto,
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new BadRequestException('Invalid user');
        }
        return this.resumeService.inviteResume(id, userId, dto);
    }
}