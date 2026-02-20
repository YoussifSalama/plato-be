import { Module } from "@nestjs/common";
import { SpeechController } from "./speech.controller";
import { SpeechService } from "./speech.service";
import { OpenAiService } from "src/shared/services/openai.service";

@Module({
    controllers: [SpeechController],
    providers: [SpeechService, OpenAiService],
    exports: [SpeechService],
})
export class SpeechModule { }

