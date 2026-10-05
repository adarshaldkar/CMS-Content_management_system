import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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

  /**
   * Sanitizes a filename to prevent Path Traversal attacks (CWE-22)
   */
  private sanitizeFilename(filename: string): string {
    const safeBaseName = path.basename(filename).replace(/[\u0000\\/]/g, '').trim();
    if (!safeBaseName || safeBaseName === '.' || safeBaseName === '..') {
      throw new BadRequestException('Invalid filename provided.');
    }
    return safeBaseName;
  }

  /**
   * Resolves and verifies that the target path is strictly within the designated uploads folder
   */
  private getSafeFilePath(filename: string): { safeName: string; resolvedPath: string } {
    const safeName = this.sanitizeFilename(filename);
    const resolvedPath = path.resolve(this.uploadDir, safeName);

    // Canonical path confinement check
    const normalizedUploadDir = path.normalize(this.uploadDir);
    if (!resolvedPath.startsWith(normalizedUploadDir + path.sep) && resolvedPath !== normalizedUploadDir) {
      this.logger.error(`[Security Alert] Blocked Path Traversal attempt for input: ${filename}`);
      throw new BadRequestException('Path traversal detected: invalid file location.');
    }

    return { safeName, resolvedPath };
  }

  async saveFile(
    filename: string,
    buffer: Buffer,
    mimeType: string,
    folder: string = 'gazette-cms/media',
  ): Promise<StoredAsset> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const { safeName, resolvedPath } = this.getSafeFilePath(filename);

    // 1. Always save local disk copy at the canonical safe path
    await fs.writeFile(resolvedPath, buffer);

    let finalUrl = `/uploads/${safeName}`;
    let storageKey = safeName;

    // 2. Upload to Cloudinary CDN if available
    if (this.isCloudinaryConfigured) {
      try {
        const publicId = path.parse(safeName).name;
        const uploadResult = await this.uploadToCloudinary(buffer, folder, publicId);
        finalUrl = uploadResult.secure_url;
        storageKey = uploadResult.public_id;
        this.logger.log(`Uploaded ${safeName} to Cloudinary CDN: ${finalUrl}`);
      } catch (err: any) {
        this.logger.warn(
          `Cloudinary upload failed for ${safeName} (${err.message}). Falling back to local file URL.`,
        );
      }
    }

    return {
      url: finalUrl,
      filename: safeName,
      storageKey,
      localPath: resolvedPath,
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
      const { resolvedPath } = this.getSafeFilePath(filename);
      await fs.unlink(resolvedPath);
    } catch {
      // Best-effort removal
    }
  }
}
