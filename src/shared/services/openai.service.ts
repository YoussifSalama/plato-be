import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
    private readonly logger = new Logger(OpenAiService.name);
    private readonly clients: OpenAI[] = [];
    public readonly apiKeys: string[] = [];
    private rotationIndex = 0;

    constructor(private readonly configService: ConfigService) {
        this.apiKeys = this.configService.get<string[]>('env.openai.apiKeys') ?? [];
        if (this.apiKeys.length === 0) {
            this.logger.error('No OpenAI API keys found in configuration.');
        }
        this.clients = this.apiKeys.map(key => new OpenAI({ apiKey: key }));
        this.logger.log(`OpenAiService initialized with ${this.clients.length} projects.`);
    }

    getApiKey(index: number = 0): string {
        return this.apiKeys[index] || '';
    }

    getClient(index?: number): OpenAI {
        if (this.clients.length === 0) {
            throw new Error('No OpenAI clients available.');
        }

        // If a specific index is requested, use it
        if (index !== undefined && index >= 0 && index < this.clients.length) {
            return this.clients[index];
        }

        // Default to first client if index is invalid or not provided
        return this.clients[0];
    }

    getRotatedClient(): { client: OpenAI; index: number } {
        if (this.clients.length === 0) {
            throw new Error('No OpenAI clients available.');
        }

        const index = this.rotationIndex;
        const client = this.clients[index];

        // Rotate index for next call
        this.rotationIndex = (this.rotationIndex + 1) % this.clients.length;

        return { client, index };
    }

    get count(): number {
        return this.clients.length;
    }
}
