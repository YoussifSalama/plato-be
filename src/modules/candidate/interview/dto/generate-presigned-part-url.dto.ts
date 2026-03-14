import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

export class GeneratePresignedPartUrlDto {
    @ApiProperty({
        description: "S3 object key (path) for the multipart upload",
        example: "interviews/123/recording.webm",
    })
    @IsNotEmpty()
    @IsString()
    key: string;

    @ApiProperty({ description: "Upload ID from createMultipartUpload response" })
    @IsNotEmpty()
    @IsString()
    uploadId: string;

    @ApiProperty({ description: "Part number (1-10000)", example: 1, minimum: 1, maximum: 10000 })
    @IsNumber()
    @Min(1)
    @Max(10000)
    partNumber: number;
}
