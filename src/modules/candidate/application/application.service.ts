import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ResumeFileTypes } from '@generated/prisma';

@Injectable()
export class ApplicationService {
    constructor(private readonly prisma: PrismaService) { }

    async apply(candidateId: number, jobId: number) {
        // 1. Fetch Job and check existence
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            throw new NotFoundException('Job not found');
        }

        // 2. Check for existing application
        const existingApplication = await this.prisma.jobApplication.findUnique({
            where: {
                candidate_id_job_id: {
                    candidate_id: candidateId,
                    job_id: jobId,
                },
            },
        });

        if (existingApplication) {
            throw new ConflictException('You have already applied for this job');
        }

        // 3. Check match score
        const match = await this.prisma.jobMatch.findUnique({
            where: {
                candidate_id_job_id: {
                    candidate_id: candidateId,
                    job_id: jobId,
                },
            },
        });

        if (!match) {
            throw new BadRequestException('You need to match with the job before applying');
        }

        if (job.auto_score_matching_threshold !== null && match.match_score < job.auto_score_matching_threshold) {
            throw new BadRequestException(`Your match score (${match.match_score}) does not meet the minimum requirement (${job.auto_score_matching_threshold}) for this job.`);
        }

        // 4. Fetch Candidate Profile for Resume Data
        const profile = await this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
        });

        if (!profile || !profile.resume_link) {
            throw new BadRequestException('You must have a resume to apply.');
        }

        const resumeLink = profile.resume_link;
        // Basic deduction of file type from extension, defaulting to PDF
        const fileType = resumeLink.toLowerCase().endsWith('.xlsx') ? ResumeFileTypes.xlsx : ResumeFileTypes.pdf;


        // 5. Transaction to create Resume and JobApplication
        return this.prisma.$transaction(async (tx) => {
            // Create a specific resume entry for this application
            // We use the candidate's name for the resume name
            const candidate = await tx.candidate.findUnique({
                where: { id: candidateId },
                select: { f_name: true, l_name: true }
            });

            const resumeName = candidate ? `${candidate.f_name} ${candidate.l_name}`.trim() : 'Candidate Resume';

            const resume = await tx.resume.create({
                data: {
                    name: resumeName,
                    file_type: fileType,
                    link: resumeLink,
                    parsed: JSON.stringify(profile.resume_parsed) || null,
                    job_id: jobId,
                    // Note: We are NOT setting candidate_id on Resume based on the schema discussion, 
                    // but we are linking via JobApplication. 
                    // Wait, the plan said "Create Resume linked to Job, but not directly to Candidate via schema".
                    // But I *did* add `application` to Resume.
                },
            });

            const application = await tx.jobApplication.create({
                data: {
                    candidate_id: candidateId,
                    job_id: jobId,
                    resume_id: resume.id,
                },
            });

            return application;
        });
    }
}
