import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IOpenAiKeyConfig } from '../types/config/env.types';

export type OpenAiClientDescriptor = {
    index: number;
    envName: string;
    platoKeyId: string;
    apiKey: string;
    client: OpenAI;
};

@Injectable()
export class OpenAiService {
    private readonly logger = new Logger(OpenAiService.name);
    private readonly descriptors: OpenAiClientDescriptor[] = [];
    public readonly apiKeys: string[] = [];
    private rotationIndex = 0;

    constructor(private readonly configService: ConfigService) {
        const keys = this.configService.get<IOpenAiKeyConfig[]>('env.openai.keys') ?? [];
        if (keys.length === 0) {
            this.logger.error('No OpenAI API keys found in configuration.');
        }
        this.descriptors = keys.map((key, index) => {
            const client = new OpenAI({ apiKey: key.apiKey });
            return {
                index,
                envName: key.envName,
                platoKeyId: key.platoKeyId,
                apiKey: key.apiKey,
                client,
            };
        });
        this.apiKeys = this.descriptors.map((d) => d.apiKey);
        this.logger.log(`OpenAiService initialized with ${this.descriptors.length} projects.`);
    }

    getApiKey(index: number = 0): string {
        return this.descriptors[index]?.apiKey || '';
    }

    getClient(index?: number): OpenAI {
        if (this.descriptors.length === 0) {
            throw new Error('No OpenAI clients available.');
        }

        return this.getClientDescriptor(index).client;
    }

    getClientDescriptor(index?: number): OpenAiClientDescriptor {
        if (this.descriptors.length === 0) {
            throw new Error('No OpenAI clients available.');
        }

        if (index !== undefined && index >= 0 && index < this.descriptors.length) {
            return this.descriptors[index];
        }

        return this.descriptors[0];
    }

    findDescriptorByPlatoKeyId(platoKeyId: string): OpenAiClientDescriptor | undefined {
        return this.descriptors.find((descriptor) => descriptor.platoKeyId === platoKeyId);
    }

    getAllClientDescriptors(): OpenAiClientDescriptor[] {
        return [...this.descriptors];
    }

    getRotatedClient(): OpenAiClientDescriptor {
        if (this.descriptors.length === 0) {
            throw new Error('No OpenAI clients available.');
        }

        const index = this.rotationIndex;
        const descriptor = this.descriptors[index];

        // Rotate index for next call
        this.rotationIndex = (this.rotationIndex + 1) % this.descriptors.length;

        return descriptor;
    }

    get count(): number {
        return this.descriptors.length;
    }
}
