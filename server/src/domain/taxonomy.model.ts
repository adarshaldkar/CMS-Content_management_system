import type { PaginationQuery } from './common.model';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string | null;
  status?: 'active' | 'inactive';
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: 'active' | 'inactive';
}

export interface CategoryQueryFilters extends PaginationQuery {
  status?: 'active' | 'inactive';
  search?: string;
}
