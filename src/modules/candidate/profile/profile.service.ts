import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import {
    UpdateProfileBasicDto,
    UpdateProfileExperienceDto,
    UpdateProfileProjectDto,
    UpdateProfileSocialLinkDto,
} from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
    constructor(private readonly prisma: PrismaService) { }

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
        return this.prisma.profile.upsert({
            where: { candidate_id: candidateId },
            create: { candidate_id: candidateId, ...dto },
            update: { ...dto },
        });
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
        return this.prisma.experience.findMany({
            where: { profile_id: profile.id },
            orderBy: { from: "desc" },
        });
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
        return this.prisma.project.findMany({
            where: { profile_id: profile.id },
            orderBy: { created_at: "desc" },
        });
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
        return this.prisma.socialLinks.findMany({
            where: { profile_id: profile.id },
            orderBy: { created_at: "desc" },
        });
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
        return this.prisma.profile.upsert({
            where: { candidate_id: candidateId },
            create: { candidate_id: candidateId, avatar: avatarPath },
            update: { avatar: avatarPath },
        });
    }
}
