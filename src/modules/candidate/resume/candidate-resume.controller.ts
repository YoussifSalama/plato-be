import {
    Controller,
    Delete,
    Get,
    Patch,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ensureUploadsDir } from 'src/shared/helpers/storage/uploads-path';
import { CandidateJwtAuthGuard } from 'src/shared/guards/candidate-jwt-auth.guard';
import { AccessTokenPayload } from 'src/shared/types/services/jwt.types';
import { CandidateResumeService } from './candidate-resume.service';
import * as path from 'path';

const getCandidateResumeFolder = () => ensureUploadsDir('resumes');

@ApiTags('Candidate Resume')
@Controller('candidate/resume')
export class CandidateResumeController {
    constructor(private readonly candidateResumeService: CandidateResumeService) { }

    @Patch()
    @ApiBearerAuth('access-token')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: 'Upload or replace resume' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
            required: ['file'],
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, callback) => {
                    callback(null, getCandidateResumeFolder());
                },
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    callback(null, `resume-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (
                    file.mimetype === 'application/pdf' ||
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ) {
                    callback(null, true);
                } else {
                    callback(new BadRequestException('Only PDF and DOCX files are allowed'), false);
                }
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    async uploadResume(
        @Req() req: { user: AccessTokenPayload },
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.candidateResumeService.parseAndSaveResume(req.user.id, file);
    }

    @Get()
    @ApiBearerAuth('access-token')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: 'Get resume info (cv_url and cv_name)' })
    async getResumeInfo(@Req() req: { user: AccessTokenPayload }) {
        return this.candidateResumeService.getResumeInfo(req.user.id);
    }
}
