import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class CreateDirectInvitationDto {
    @ApiProperty({ example: 123 })
    @IsInt()
    @Min(1)
    candidate_id: number;

    @ApiProperty({ example: 456 })
    @IsInt()
    @Min(1)
    job_id: number;
}
