import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ResumeParserService } from 'src/shared/helpers/modules/agency/resume/resume.helper';
import { OpenAiService } from 'src/shared/services/openai.service';
import { ensureUploadsDir } from 'src/shared/helpers/storage/uploads-path';
import * as path from 'path';
import { buildCandidateResumeAiPrompt } from 'src/shared/ai/candidate/prompts/resume.prompt';


@Injectable()
export class CandidateResumeService {
    private readonly logger = new Logger(CandidateResumeService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly resumeParserService: ResumeParserService,
        private readonly openaiService: OpenAiService,
    ) { }

    private get openai() {
        return this.openaiService.getRotatedClient().client;
    }

    async parseAndSaveResume(candidateId: number, file: Express.Multer.File, shouldParse: boolean = true) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        // const uploadsDir = ensureUploadsDir('resumes');
        // const filePath = path.join(uploadsDir, file.filename);

        let structuredData: any = undefined;

        if (shouldParse) {
            // 1. Parse text from file
            const parsedText = await this.resumeParserService.parse(path.join(process.cwd(), 'uploads/resumes', file.filename));

            // 2. Extract structured data using OpenAI
            structuredData = await this.extractStructuredData(parsedText);
        }

        // 3. Update Profile
        // We store the relative path (or filename) similar to how other files are stored.
        // The resume parser helper takes absolute path but we store relative or filename.
        // Profile avatar stores: `/uploads/candidate/avatar/${file.filename}`
        const resumeLink = `/uploads/resumes/${file.filename}`;

        // Check if there is an existing resume and delete it
        const currentProfile = await this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
            select: { resume_link: true },
        });

        if (currentProfile?.resume_link) {
            try {
                const oldFilePath = path.join(process.cwd(), currentProfile.resume_link);
                const fs = await import('fs/promises');
                await fs.unlink(oldFilePath);
            } catch (error) {
                this.logger.warn(`Failed to delete old resume file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        try {
            await this.prisma.profile.upsert({
                where: { candidate_id: candidateId },
                create: {
                    candidate_id: candidateId,
                    resume_link: resumeLink,
                    resume_parsed: structuredData,
                },
                update: {
                    resume_link: resumeLink,
                    resume_parsed: structuredData,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to update profile for candidate ${candidateId}`, error);
            throw error;
        }

        return {
            cv_url: resumeLink,
            cv_name: file.filename,
            ...(structuredData || {}),
        };
    }

    async parseCurrentResume(candidateId: number) {
        const profile = await this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
            select: { resume_link: true },
        });

        if (!profile || !profile.resume_link) {
            throw new BadRequestException('No resume found to parse');
        }

        const filePath = path.join(process.cwd(), profile.resume_link);

        // 1. Parse text from file
        const parsedText = await this.resumeParserService.parse(filePath);

        // 2. Extract structured data using OpenAI
        const structuredData = await this.extractStructuredData(parsedText);

        // 3. Update Profile with parsed data
        await this.prisma.profile.update({
            where: { candidate_id: candidateId },
            data: {
                resume_parsed: structuredData,
            },
        });

        return structuredData;
    }

    private async extractStructuredData(resumeText: string) {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: buildCandidateResumeAiPrompt()
                },
                {
                    role: "user",
                    content: resumeText
                }
            ],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('Failed to extract data from resume');
        }
        return JSON.parse(content);
    }

    async getResumeInfo(candidateId: number) {
        const profile = await this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
            select: {
                resume_link: true,
            },
        });

        if (!profile || !profile.resume_link) {
            return {
                cv_url: null,
                cv_name: null,
            };
        }

        // Extract filename from the resume_link path
        const cv_name = profile.resume_link.split('/').pop() || null;

        return {
            cv_url: profile.resume_link,
            cv_name: cv_name,
        };
    }

    async deleteResume(candidateId: number) {
        const profile = await this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
            select: {
                resume_link: true,
            },
        });

        if (!profile || !profile.resume_link) {
            throw new BadRequestException('No resume found to delete');
        }

        // Delete the file from filesystem
        try {
            const filePath = path.join(process.cwd(), profile.resume_link);
            const fs = await import('fs/promises');
            await fs.unlink(filePath);
        } catch (error) {
            this.logger.warn(`Failed to delete resume file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Continue even if file deletion fails
        }

        // Update profile to remove resume references
        await this.prisma.profile.update({
            where: { candidate_id: candidateId },
            data: {
                resume_link: null,
                resume_parsed: undefined,
            },
        });

        return {
            message: 'Resume deleted successfully',
        };
    }
}
