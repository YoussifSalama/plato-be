import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import {
    UpdateProfileBasicDto,
    UpdateProfileExperienceDto,
    UpdateProfileProjectDto,
    UpdateProfileSocialLinkDto,
} from './dto/update-profile.dto';
import { CandidateNotificationService } from '../notification/notification.service';

@Injectable()
export class ProfileService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly candidateNotificationService: CandidateNotificationService
    ) { }

    private async getOrCreateProfile(candidateId: number) {
        const profile = await this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
        });
        if (profile) {
            return profile;
        }
        return this.prisma.profile.create({
            data: { candidate_id: candidateId },
        });
    }

    async getProfile(candidateId: number) {
        await this.getOrCreateProfile(candidateId);
        return this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
            include: {
                experiences: true,
                projects: true,
                social_links: true,
            },
        });
    }

    async updateBasic(candidateId: number, dto: UpdateProfileBasicDto) {
        const result = await this.prisma.profile.upsert({
            where: { candidate_id: candidateId },
            create: { candidate_id: candidateId, ...dto },
            update: { ...dto },
        });

        this.candidateNotificationService.emitAccountUpdate(candidateId, { type: 'PROFILE_UPDATED', section: 'basic' });

        return result;
    }

    async replaceExperiences(candidateId: number, experiences: UpdateProfileExperienceDto[] = []) {
        const profile = await this.getOrCreateProfile(candidateId);
        const data = experiences.map((item) => ({
            ...item,
            profile_id: profile.id,
            current: item.current ?? false,
        }));
        await this.prisma.$transaction([
            this.prisma.experience.deleteMany({ where: { profile_id: profile.id } }),
            ...(data.length
                ? [this.prisma.experience.createMany({ data })]
                : []),
        ]);
        const result = await this.prisma.experience.findMany({
            where: { profile_id: profile.id },
            orderBy: { from: "desc" },
        });

        this.candidateNotificationService.emitAccountUpdate(candidateId, { type: 'PROFILE_UPDATED', section: 'experiences' });

        return result;
    }

    async replaceProjects(candidateId: number, projects: UpdateProfileProjectDto[] = []) {
        const profile = await this.getOrCreateProfile(candidateId);
        const data = projects.map((item) => ({
            ...item,
            profile_id: profile.id,
        }));
        await this.prisma.$transaction([
            this.prisma.project.deleteMany({ where: { profile_id: profile.id } }),
            ...(data.length
                ? [this.prisma.project.createMany({ data })]
                : []),
        ]);
        const result = await this.prisma.project.findMany({
            where: { profile_id: profile.id },
            orderBy: { created_at: "desc" },
        });

        this.candidateNotificationService.emitAccountUpdate(candidateId, { type: 'PROFILE_UPDATED', section: 'projects' });

        return result;
    }

    async replaceSocialLinks(candidateId: number, socialLinks: UpdateProfileSocialLinkDto[] = []) {
        const profile = await this.getOrCreateProfile(candidateId);
        const data = socialLinks.map((item) => ({
            ...item,
            profile_id: profile.id,
        }));
        await this.prisma.$transaction([
            this.prisma.socialLinks.deleteMany({ where: { profile_id: profile.id } }),
            ...(data.length
                ? [this.prisma.socialLinks.createMany({ data })]
                : []),
        ]);
        const result = await this.prisma.socialLinks.findMany({
            where: { profile_id: profile.id },
            orderBy: { created_at: "desc" },
        });

        this.candidateNotificationService.emitAccountUpdate(candidateId, { type: 'PROFILE_UPDATED', section: 'social_links' });

        return result;
    }

    async updateAvatar(
        candidateId: number,
        file: { filename?: string; mimetype?: string }
    ) {
        if (!file?.filename) {
            throw new BadRequestException("Avatar image is required.");
        }
        if (!file.mimetype || !file.mimetype.startsWith("image/")) {
            throw new BadRequestException("Avatar must be an image file.");
        }
        const avatarPath = `/uploads/candidate/avatar/${file.filename}`;
        const result = await this.prisma.profile.upsert({
            where: { candidate_id: candidateId },
            create: { candidate_id: candidateId, avatar: avatarPath },
            update: { avatar: avatarPath },
        });

        this.candidateNotificationService.emitAccountUpdate(candidateId, { type: 'PROFILE_UPDATED', section: 'avatar' });

        return result;
    }
}
