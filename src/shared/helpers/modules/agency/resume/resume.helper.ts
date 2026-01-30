import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class ResumeParserService {
    private readonly logger = new Logger(ResumeParserService.name);

    async parse(filePath: string): Promise<string> {
        try {
            const ext = path.extname(filePath).toLowerCase();
            this.logger.log(`Parsing resume file ${path.basename(filePath)} (${ext}).`);

            if (ext === '.pdf') {
                return this.parsePdf(filePath);
            }

            if (ext === '.docx') {
                return this.parseDocx(filePath);
            }

            throw new BadRequestException('Unsupported file type');
        } catch (error) {
            this.logger.error(`Failed to parse resume file ${path.basename(filePath)}.`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }

    private async parsePdf(filePath: string): Promise<string> {
        const buffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: buffer });
        try {
            const { text } = await parser.getText();
            return this.cleanText(text);
        } finally {
            await parser.destroy();
        }
    }

    private async parseDocx(filePath: string): Promise<string> {
        const { value } = await mammoth.extractRawText({ path: filePath });
        return this.cleanText(value);
    }

    private cleanText(text: string): string {
        const normalized = text
            .replace(/\r/g, '')
            .replace(/\u0000/g, '')
            .replace(/\u00a0/g, ' ')
            .replace(/[‐‑‒–—]/g, '-')
            .replace(/[•●▪■◦]/g, '-');

        const lines = normalized
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        return lines
            .join('\n')
            .replace(/-\n(?=\S)/g, '')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }
}
