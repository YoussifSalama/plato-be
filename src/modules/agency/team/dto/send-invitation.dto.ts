import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class SendInvitationDto {
    @ApiProperty({ description: 'ID of the agency sending the invitation', example: 1 })
    @IsNotEmpty()
    @IsNumber()
    agencyId: number;

    @ApiProperty({ description: 'Email of the team member to invite', example: 'john@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string

    @ApiProperty({ description: 'Optional name of the team member to invite', example: 'John Doe' })
    @IsOptional()
    memberName?: string;
}

export class SendInvitationDtoBody {
    @ApiProperty({ description: 'Email of the team member to invite', example: 'john@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string

    @ApiProperty({ description: 'Optional name of the team member to invite', example: 'John Doe' })
    @IsOptional()
    memberName?: string;
}