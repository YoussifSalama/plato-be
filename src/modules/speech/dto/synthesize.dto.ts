import { IsIn, IsOptional, IsString } from "class-validator";

const voices = ["ash", "alloy", "verse", "aria", "sage", "coral"] as const;
const formats = ["mp3", "wav", "opus", "aac", "flac", "pcm"] as const;

export class SynthesizeDto {
    @IsString()
    text!: string;

    @IsOptional()
    @IsIn(voices)
    voice?: typeof voices[number];

    @IsOptional()
    @IsIn(formats)
    format?: typeof formats[number];

    @IsOptional()
    @IsString()
    @IsIn(["en", "ar"])
    language?: "en" | "ar";
}

