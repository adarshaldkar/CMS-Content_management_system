export type ActiveDatabase =
  | 'postgres'
  | 'mongodb'
  | 'mariadb'
  | 'mysql'
  | 'cockroach'
  | 'clickhouse';


export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
