import {
    Controller,
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
import { DocumentService } from './document.service';
import * as path from 'path';

const getCandidateDocumentFolder = () => ensureUploadsDir('candidate/documents');

@ApiTags('Candidate Documents')
@Controller('candidate/documents')
export class DocumentController {
    constructor(private readonly documentService: DocumentService) { }

    @Post('upload')
    @ApiBearerAuth('access-token')
    @UseGuards(CandidateJwtAuthGuard)
    @ApiOperation({ summary: 'Upload a required document' })
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
                    callback(null, getCandidateDocumentFolder());
                },
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    callback(null, `doc-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                const allowedMimeTypes = [
                    'application/pdf',
                    'image/jpeg',
                    'image/png',
                    'image/jpg',
                ];
                if (allowedMimeTypes.includes(file.mimetype)) {
                    callback(null, true);
                } else {
                    callback(new BadRequestException('Only PDF, JPG, and PNG files are allowed'), false);
                }
            },
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
            },
        }),
    )
    async uploadDocument(
        @Req() req: { user: AccessTokenPayload },
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return {
            filename: file.filename,
            originalName: file.originalname,
            url: `/uploads/candidate/documents/${file.filename}`,
        };
    }
}
