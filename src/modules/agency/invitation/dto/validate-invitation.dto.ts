import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ValidateInvitationDto {
    @ApiProperty({ example: "invitation-token" })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    token: string;
}