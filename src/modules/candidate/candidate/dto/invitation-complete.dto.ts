import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class InvitationCompleteDto {
    @ApiProperty({ example: "invitation-token" })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: "Str0ngP@ssw0rd!" })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({
        example: [{ name: "PMP", link: "https://example.com/pmp.pdf" }],
        required: false
    })
    documents?: { name: string; link: string }[];
}

