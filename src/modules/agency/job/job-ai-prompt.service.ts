import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { CreateJobAiPromptDto } from "./dto/create-job-ai-prompt.dto";

@Injectable()
export class JobAiPromptService {
    constructor(private readonly prisma: PrismaService) { }

    async createPrompt(dto: CreateJobAiPromptDto) {
        const jobAiPromptClient = (this.prisma as unknown as {
            jobAiPrompt: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> }
        }).jobAiPrompt;
        return jobAiPromptClient.create({
            data: {
                ...dto,
            },
        });
    }

    private async ensurePromptExists(promptId: number) {
        const jobAiPromptClient = (this.prisma as unknown as {
            jobAiPrompt: { findUnique: (args: { where: { id: number }; select: { id: true } }) => Promise<{ id: number } | null> }
        }).jobAiPrompt;
        const prompt = await jobAiPromptClient.findUnique({
            where: { id: promptId },
            select: { id: true },
        });
        if (!prompt) {
            throw new BadRequestException("Prompt not found.");
        }
    }

    async activatePrompt(promptId: number) {
        await this.ensurePromptExists(promptId);
        const jobAiPromptClient = (this.prisma as unknown as {
            jobAiPrompt: { update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown> }
        }).jobAiPrompt;
        return jobAiPromptClient.update({
            where: { id: promptId },
            data: { is_active: true },
        });
    }

    async inactivatePrompt(promptId: number) {
        await this.ensurePromptExists(promptId);
        const jobAiPromptClient = (this.prisma as unknown as {
            jobAiPrompt: { update: (args: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown> }
        }).jobAiPrompt;
        return jobAiPromptClient.update({
            where: { id: promptId },
            data: { is_active: false },
        });
    }
}

