import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CandidateLoginDto {
    @ApiProperty({ example: "candidate@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "Str0ngP@ssw0rd!" })
    @IsString()
    @IsNotEmpty()
    password: string;
}

