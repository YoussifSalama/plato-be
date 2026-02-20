import { BadRequestException, Injectable } from "@nestjs/common";
import { OpenAiService } from "src/shared/services/openai.service";
import { toFile } from "openai/uploads";
import { arAiInstructionsTts, enAiInstructionsTts } from "src/shared/ai/tts/ai.instructions.tts";

type SpeechFormat = "mp3" | "wav" | "opus" | "aac" | "flac" | "pcm";

const MAX_TTS_INPUT_CHARS = 600;
const MAX_TTS_INSTRUCTIONS_CHARS = 1200;

const clampText = (value: string, maxChars: number) =>
    value.length > maxChars ? `${value.slice(0, maxChars).trim()}…` : value;

@Injectable()
export class SpeechService {
    constructor(private readonly openaiService: OpenAiService) { }

    private get openai() {
        return this.openaiService.getRotatedClient().client;
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

    async synthesizeSpeech(text: string, voice = "ash", format: SpeechFormat = "mp3", language: "en" | "ar" = "en") {
        if (!text?.trim()) {
            throw new BadRequestException("Text is required.");
        }
        const aiInstructionsTts = language === "en" ? enAiInstructionsTts : arAiInstructionsTts;
        const safeInstructions = clampText(aiInstructionsTts, MAX_TTS_INSTRUCTIONS_CHARS);
        const safeText = clampText(text.trim(), MAX_TTS_INPUT_CHARS);
        const response = await this.openai.audio.speech.create({
            model: "gpt-4o-mini-tts",
            voice,
            instructions: safeInstructions,
            input: safeText,
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

