import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class AgencyApplicationService {
    constructor(private readonly prisma: PrismaService) { }

    async getApplications(jobId: number, agencyId: number) {
        // 1. Verify Job belongs to Agency
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            select: { agency_id: true }
        });

        if (!job) {
            throw new NotFoundException('Job not found');
        }

        // Check if the agency associated with the job matches the requesting agency
        // Note: The agency_id in the token might be the user's ID if not properly differentiated, 
        // but typically in this system Account -> Agency.
        // Let's verify how agencyId is derived. 
        // In AgencyController (e.g., JobService), it usually checks `agency_id` from the user payload or looks up the agency.
        // The `JwtAuthGuard` populates `req.user`.
        // Let's check `AccessTokenPayload`.

        // Assuming req.user.agency_id is populated or we need to find it.
        // Looking at `JwtService` payload type:
        // export type AccessTokenPayload = { id: number; email: string; provider: IJwtProvider; agency_id?: number; ... };

        // If agency_id is in payload, we use it. If not, we might need to look it up via Account.
        // For now, let's assume `agencyId` passed here is the actual Agency ID.
        // If the `JwtAuthGuard` doesn't put `agency_id` in `req.user`, we might need to fetch it.
        // But let's assume the controller passes the correct ID.

        // Wait, `req.user.id` is usually the Account ID.
        // We need to get the Agency ID associated with this Account.

        const account = await this.prisma.account.findUnique({
            where: { id: agencyId }, // agencyId passed from controller is req.user.id (Account ID)
            select: { agency_id: true }
        });

        if (!account || !account.agency_id) {
            throw new ForbiddenException('You do not have an agency profile.');
        }

        if (job.agency_id !== account.agency_id) {
            throw new ForbiddenException('You do not have permission to view applications for this job.');
        }

        // 2. Fetch Applications
        const applications = await this.prisma.jobApplication.findMany({
            where: { job_id: jobId },
            include: {
                candidate: {
                    select: {
                        id: true,
                        f_name: true,
                        l_name: true,
                        email: true,
                        phone: true,
                        profile: {
                            select: {
                                avatar: true,
                                headline: true,
                                location: true
                            }
                        }
                    }
                },
                resume: {
                    select: {
                        id: true,
                        name: true,
                        link: true,
                        file_type: true,
                        created_at: true
                    }
                },
                job: {
                    select: {
                        title: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return applications;
    }
}
