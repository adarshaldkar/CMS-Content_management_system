import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export interface MediaFilters {
  uploadedBy?: string;
  page?: number;
  limit?: number;
}

export interface IMediaRepository {
  create(data: CreateMediaDto): Promise<Media>;
  findById(id: string): Promise<Media | null>;
  findMany(filters: MediaFilters): Promise<PaginatedResult<Media>>;
  delete(id: string): Promise<boolean>;
}
