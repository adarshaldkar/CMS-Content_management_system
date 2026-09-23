import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';
import type {
  IMediaRepository,
  MediaFilters,
} from '../interfaces/media.repository.interface';
import {
  MediaDocument,
  MediaSchemaClass,
} from './media.schema';

@Injectable()
export class MongoMediaRepository implements IMediaRepository {
  constructor(
    @InjectModel(MediaSchemaClass.name)
    private readonly mediaModel: Model<MediaDocument>,
  ) {}

  private toDomain(doc: any): Media {
    return {
      id: doc._id.toString(),
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      url: doc.url,
      uploadedBy: doc.uploadedBy,
      variants: doc.variants || undefined,
      optimization: doc.optimization || undefined,
      processingStatus: doc.processingStatus || 'READY',
      aspectRatio: doc.aspectRatio,
      usageProfile: doc.usageProfile,
      storageKey: doc.storageKey,
      cdnUrl: doc.cdnUrl,
      createdAt: doc.createdAt,
    };
  }

  async create(data: CreateMediaDto): Promise<Media> {
    const created = await this.mediaModel.create({
      ...(data.id ? { _id: data.id } : {}),
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      url: data.url,
      uploadedBy: data.uploadedBy,
      variants: data.variants || [],
      optimization: data.optimization || null,
      processingStatus: data.processingStatus || 'READY',
      aspectRatio: data.aspectRatio,
      usageProfile: data.usageProfile,
      storageKey: data.storageKey,
      cdnUrl: data.cdnUrl,
    });
    return this.toDomain(created);
  }

  async update(id: string, updates: Partial<Media>): Promise<Media | null> {
    const updated = await this.mediaModel
      .findByIdAndUpdate(id, { $set: updates }, { new: true })
      .exec();
    return updated ? this.toDomain(updated) : null;
  }

  async findById(id: string): Promise<Media | null> {
    const doc = await this.mediaModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findMany(filters: MediaFilters): Promise<PaginatedResult<Media>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 24, 100);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.uploadedBy) {
      query.uploadedBy = filters.uploadedBy;
    }

    const [items, total] = await Promise.all([
      this.mediaModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.mediaModel.countDocuments(query).exec(),
    ]);

    return {
      items: items.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.mediaModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
