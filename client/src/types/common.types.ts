export type ActiveDatabase = 'postgres' | 'mongodb';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
