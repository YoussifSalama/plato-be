import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CompletedPartDto {
    @ApiProperty({ description: "ETag returned when the part was uploaded", example: '"d8e8fca2dc0f896fd7cb4cb0031ba249"' })
    @IsNotEmpty()
    @IsString()
    ETag: string;

    @ApiProperty({ description: "Part number (1-10000)", example: 1 })
    @IsNumber()
    @Min(1)
    PartNumber: number;
}

export class CompleteMultipartUploadDto {
    @ApiProperty({ description: "S3 bucket name" })
    @IsNotEmpty()
    @IsString()
    bucketName: string;

    @ApiProperty({ description: "S3 object key" })
    @IsNotEmpty()
    @IsString()
    key: string;

    @ApiProperty({ description: "Upload ID from createMultipartUpload response" })
    @IsNotEmpty()
    @IsString()
    uploadId: string;

    @ApiProperty({
        description: "Parts array with ETag and PartNumber from each UploadPart response",
        type: [CompletedPartDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CompletedPartDto)
    parts: CompletedPartDto[];
}
