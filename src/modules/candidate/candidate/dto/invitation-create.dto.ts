import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class InvitationCreateDto {
    @ApiProperty({ example: "invitation-token" })
    @IsString()
    @IsNotEmpty()
    token: string;
}

