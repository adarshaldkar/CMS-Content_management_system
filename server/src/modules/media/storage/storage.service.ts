import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface StoredAsset {
  url: string;
  filename: string;
  storageKey?: string;
  localPath: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');
  private isCloudinaryConfigured = false;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isCloudinaryConfigured = true;
      this.logger.log(`Cloudinary CDN storage initialized for cloud "${cloudName}".`);
    } else {
      this.logger.warn('Cloudinary credentials not detected; using local disk storage.');
    }
  }

  async saveFile(
    filename: string,
    buffer: Buffer,
    mimeType: string,
    folder: string = 'gazette-cms/media',
  ): Promise<StoredAsset> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const localFilePath = path.join(this.uploadDir, filename);

    // 1. Always save local disk copy
    await fs.writeFile(localFilePath, buffer);

    let finalUrl = `/uploads/${filename}`;
    let storageKey = filename;

    // 2. Upload to Cloudinary CDN if available
    if (this.isCloudinaryConfigured) {
      try {
        const publicId = path.parse(filename).name;
        const uploadResult = await this.uploadToCloudinary(buffer, folder, publicId);
        finalUrl = uploadResult.secure_url;
        storageKey = uploadResult.public_id;
        this.logger.log(`Uploaded ${filename} to Cloudinary CDN: ${finalUrl}`);
      } catch (err: any) {
        this.logger.warn(
          `Cloudinary upload failed for ${filename} (${err.message}). Falling back to local file URL.`,
        );
      }
    }

    return {
      url: finalUrl,
      filename,
      storageKey,
      localPath: localFilePath,
    };
  }

  private uploadToCloudinary(
    buffer: Buffer,
    folder: string,
    publicId: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload stream returned empty response'));
          }
          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  async deleteLocalFile(filename: string): Promise<void> {
    try {
      const localFilePath = path.join(this.uploadDir, filename);
      await fs.unlink(localFilePath);
    } catch {
      // Best-effort removal
    }
  }
}
