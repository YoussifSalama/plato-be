import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { arAiInstructionsTts, enAiInstructionsTts } from "src/shared/ai/tts/ai.instructions.tts";

type SpeechFormat = "mp3" | "wav" | "opus" | "aac" | "flac" | "pcm";

@Injectable()
export class SpeechService {
    private readonly openai: OpenAI;

    constructor(private readonly config: ConfigService) {
        this.openai = new OpenAI({
            apiKey: this.config.get<string>("env.openai.apiKey") ?? "",
        });
    }

    async transcribeAudio(
        file: { buffer?: Buffer; originalname?: string; mimetype?: string },
        language?: string,
    ) {
        if (!file?.buffer) {
            throw new BadRequestException("Audio file is required.");
        }
        const upload = await toFile(file.buffer, file.originalname || "audio", {
            type: file.mimetype || "application/octet-stream",
        });
        const response = await this.openai.audio.transcriptions.create({
            file: upload,
            model: "gpt-4o-transcribe",
            language,
        });
        return { text: response.text };
    }

    async synthesizeSpeech(text: string, voice = "alloy", format: SpeechFormat = "mp3", language: "en" | "ar" = "en") {
        if (!text?.trim()) {
            throw new BadRequestException("Text is required.");
        }
        const aiInstructionsTts = language === "en" ? enAiInstructionsTts : arAiInstructionsTts;
        const response = await this.openai.audio.speech.create({
            model: "gpt-4o-mini-tts",
            voice,
            instructions: aiInstructionsTts,
            input: text,
            response_format: format,
        });
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        if (!audioBuffer.length) {
            throw new BadRequestException("Empty audio response from TTS.");
        }
        const contentType = format === "wav"
            ? "audio/wav"
            : format === "opus"
                ? "audio/opus"
                : format === "aac"
                    ? "audio/aac"
                    : format === "flac"
                        ? "audio/flac"
                        : format === "pcm"
                            ? "audio/pcm"
                            : "audio/mpeg";
        return { audioBuffer, contentType };
    }
}

