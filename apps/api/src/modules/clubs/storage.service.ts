import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Environment } from '../../config/environment';

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly client: S3Client | undefined;
  private readonly bucket: string;
  constructor(private readonly config: ConfigService<Environment, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    const endpoint = config.get('S3_ENDPOINT', { infer: true });
    const accessKeyId = config.get('S3_ACCESS_KEY_ID', { infer: true });
    const secretAccessKey = config.get('S3_SECRET_ACCESS_KEY', { infer: true });
    if (endpoint && accessKeyId && secretAccessKey)
      this.client = new S3Client({
        endpoint,
        region: config.get('S3_REGION', { infer: true }),
        forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
        credentials: { accessKeyId, secretAccessKey },
        maxAttempts: 2,
      });
  }
  onModuleDestroy() {
    this.client?.destroy();
  }
  private ready() {
    if (!this.client)
      throw new ServiceUnavailableException('Backend.storageUnavailable');
    return this.client;
  }
  async put(key: string, body: Buffer, contentType: string) {
    try {
      await this.ready().send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch {
      throw new ServiceUnavailableException('Backend.storageUnavailable');
    }
  }
  async get(key: string) {
    try {
      const result = await this.ready().send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!result.Body) throw new Error('Missing object');
      return Buffer.from(await result.Body.transformToByteArray());
    } catch {
      throw new ServiceUnavailableException('Backend.storageUnavailable');
    }
  }
  async delete(key: string) {
    try {
      await this.ready().send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      throw new ServiceUnavailableException('Backend.storageUnavailable');
    }
  }
  async preview(key: string) {
    try {
      return {
        url: await getSignedUrl(
          this.ready(),
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
          { expiresIn: 60 },
        ),
        expiresIn: 60,
      };
    } catch {
      throw new ServiceUnavailableException('Backend.storageUnavailable');
    }
  }
  configured() {
    return Boolean(this.client);
  }
  async *objects(prefix = 'clubs/') {
    let continuation: string | undefined;
    do {
      const page = await this.ready().send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuation,
        }),
        { abortSignal: AbortSignal.timeout(10000) },
      );
      for (const object of page.Contents ?? [])
        if (object.Key && object.LastModified)
          yield { key: object.Key, modifiedAt: object.LastModified };
      continuation = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !continuation)
        throw new Error('Incomplete storage listing');
    } while (continuation);
  }
  async health() {
    await this.ready().send(new HeadBucketCommand({ Bucket: this.bucket }), {
      abortSignal: AbortSignal.timeout(5000),
    });
    return { status: 'ok' };
  }
}
