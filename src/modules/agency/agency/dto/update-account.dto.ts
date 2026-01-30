import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateAccountDto {
    @ApiPropertyOptional({ description: "First name", example: "John" })
    @IsOptional()
    @IsString()
    f_name?: string;

    @ApiPropertyOptional({ description: "Last name", example: "Doe" })
    @IsOptional()
    @IsString()
    l_name?: string;

    @ApiPropertyOptional({ description: "Username", example: "john_doe" })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(32)
    @Matches(/^[a-zA-Z0-9]+$/, {
        message: "Username must contain only letters and numbers",
    })
    user_name?: string;

}

