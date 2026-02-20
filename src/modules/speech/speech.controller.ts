import { Body, Controller, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { TranscribeDto } from "./dto/transcribe.dto";
import { SynthesizeDto } from "./dto/synthesize.dto";
import { SpeechService } from "./speech.service";

@ApiTags("Speech")
@Controller("speech")
export class SpeechController {
    constructor(private readonly speechService: SpeechService) { }

    @Post("transcribe")
    @ApiOperation({ summary: "Transcribe audio to text (OpenAI STT)" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary" },
                language: { type: "string", example: "ar" },
            },
            required: ["file"],
        },
    })
    @UseInterceptors(FileInterceptor("file"))
    async transcribe(
        @UploadedFile() file: any,
        @Body() dto: TranscribeDto,
    ) {
        return this.speechService.transcribeAudio(file, dto.language);
    }

    @Post("synthesize")
    @ApiOperation({ summary: "Synthesize text to speech (OpenAI TTS)" })
    @ApiBody({ schema: { type: "object", properties: { text: { type: "string" }, voice: { type: "string", enum: ["ash", "alloy", "verse", "aria", "sage", "coral", "cedar"] }, format: { type: "string", enum: ["mp3", "wav", "opus", "aac", "flac", "pcm"] }, language: { type: "string", enum: ["en", "ar"] } } } })
    @ApiProduces("audio/mpeg", "audio/wav", "audio/opus", "audio/aac", "audio/flac", "audio/pcm")
    async synthesize(@Body() dto: SynthesizeDto, @Res() res: Response) {
        const { audioBuffer, contentType } = await this.speechService.synthesizeSpeech(
            dto.text,
            dto.voice,
            dto.format,
            dto.language,
        );
        const fileExtension = dto.format ?? "mp3";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", audioBuffer.length);
        res.setHeader("Content-Disposition", `inline; filename="speech.${fileExtension}"`);
        res.status(200).send(audioBuffer);
    }
}

