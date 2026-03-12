import { Injectable } from "@nestjs/common";
import { CompleteMultipartUploadCommand, CompleteMultipartUploadCommandOutput, CreateBucketCommand, CreateBucketCommandOutput, CreateMultipartUploadCommand, CreateMultipartUploadCommandOutput, DeleteBucketCommand, DeleteBucketCommandOutput, PutObjectCommand, S3, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class AwsS3Service {
    private s3 = new S3();

    async createBucket(bucketName: string): Promise<CreateBucketCommandOutput & { bucket: string }> {
        const command = new CreateBucketCommand({
            Bucket: bucketName,
        });
        const response = await this.s3.send(command);
        return { ...response, bucket: bucketName };
    }

    async DeleteBucket(bucketName: string): Promise<void> {
        const command = new DeleteBucketCommand({
            Bucket: bucketName,
        });
        await this.s3.send(command);
    }


    async createMultipartUpload(bucketName: string, key: string): Promise<CreateMultipartUploadCommandOutput> {
        const command = new CreateMultipartUploadCommand({
            Bucket: bucketName,
            Key: key,
        });
        const response = await this.s3.send(command);
        return response;
    }

    async generatePresignedUrl(bucketName: string, key: string): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const presignedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
        return presignedUrl;
    }

    async completeMultipartUpload(
        bucketName: string,
        key: string,
        uploadId: string,
        parts: { ETag: string; PartNumber: number }[],
    ): Promise<CompleteMultipartUploadCommandOutput> {
        const command = new CompleteMultipartUploadCommand({
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
        });
        const response = await this.s3.send(command);
        return response;
    }

    async generatePresignedPartUrl(
        bucketName: string,
        key: string,
        uploadId: string,
        partNumber: number,
    ): Promise<string> {
        const command = new UploadPartCommand({
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });
        const presignedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
        return presignedUrl;
    }

}