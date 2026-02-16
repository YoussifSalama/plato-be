import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsNotEmpty, Min } from "class-validator";

export class AppendQaLogDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;

    @ApiProperty({ description: "Role of the message", example: "assistant", enum: ["assistant", "user"] })
    @IsIn(["assistant", "user"])
    role: "assistant" | "user";

    @ApiProperty({ description: "Transcript content", example: "Hello, can you tell me about yourself?" })
    @IsNotEmpty()
    content: string;
}

