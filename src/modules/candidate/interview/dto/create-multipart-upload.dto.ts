import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateMultipartUploadDto {
    @ApiProperty({
        description: "S3 object key (path) for the upload",
        example: "interviews/123/recording.webm",
    })
    @IsNotEmpty()
    @IsString()
    key: string;
}
