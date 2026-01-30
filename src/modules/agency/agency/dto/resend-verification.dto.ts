import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ResendVerificationDto {
    @ApiProperty({
        description: "The expired or invalid verification token",
        example: "9f7c9b6f-3e0b-4f69-8f55-2ce4c2f55b8b",
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}

