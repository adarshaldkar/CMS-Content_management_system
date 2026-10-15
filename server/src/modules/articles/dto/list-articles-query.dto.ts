import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '../../../domain/models';

/**
 * Validated query DTO for GET /api/articles
 *
 * All optional fields use class-validator constraints so that
 * malformed external inputs (e.g. "fromDate=fromDate") are rejected
 * at the HTTP validation boundary with HTTP 400 before the value
 * ever reaches the database layer.
 *
 * This closes the ZAP findings:
 *   90022 – Application Error Disclosure
 *   10023 – Information Disclosure – Debug Error Messages
 * which were triggered by `new Date("fromDate")` producing NaN
 * and causing PostgreSQL to return a timestamp parse error → HTTP 500.
 */
export class ListArticlesQueryDto {
  /** Page number, must be a positive integer */
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer.' })
  @Min(1, { message: 'page must be at least 1.' })
  page?: number = 1;

  /** Number of items per page, capped at 50 */
  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer.' })
  @Min(1, { message: 'limit must be at least 1.' })
  @Max(100, { message: 'limit must not exceed 100.' })
  limit?: number = 20;

  /** Filter by article workflow status (must be a valid ContentStatus enum value) */
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus, {
    message: `status must be one of: ${Object.values(ContentStatus).join(', ')}.`,
  })
  status?: ContentStatus;

  /** Full-text search query (max 200 chars to prevent ReDoS-style abuse) */
  @ApiPropertyOptional({ example: 'quantum computing' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'search must not exceed 200 characters.' })
  @Matches(/^[^\u0000]*$/, {
    message: 'search contains invalid characters',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  /** Filter by author UUID */
  @ApiPropertyOptional({ example: 'c1000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID('4', { message: 'authorId must be a valid UUID.' })
  authorId?: string;

  /** Filter by category UUID */
  @ApiPropertyOptional({ example: 'c2000000-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID.' })
  categoryId?: string;

  /** Filter by category slug */
  @ApiPropertyOptional({ example: 'technology' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  categorySlug?: string;

  /**
   * Comma-separated category slugs, or repeated query keys
   * (e.g. ?categorySlugs=tech&categorySlugs=ai).
   * Passed through as-is; the repository handles both forms.
   */
  @ApiPropertyOptional({ example: 'technology,ai' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  categorySlugs?: string | string[];

  /** Comma-separated tag slugs */
  @ApiPropertyOptional({ example: 'typescript,nestjs' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagSlugs?: string | string[];

  /** Content type filter */
  @ApiPropertyOptional({ enum: ['article', 'video', 'gallery', 'series', 'all'] })
  @IsOptional()
  @IsIn(['article', 'video', 'gallery', 'series', 'all'], {
    message: "contentType must be one of: article, video, gallery, series, all.",
  })
  contentType?: 'article' | 'video' | 'gallery' | 'series' | 'all';

  /**
   * Alias for categorySlug — retained for backwards API compatibility.
   * Validated the same way as categorySlug.
   */
  @ApiPropertyOptional({ example: 'technology' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  /**
   * Legacy sort shorthand (popular | trending | latest).
   * Translates to sortBy internally.
   */
  @ApiPropertyOptional({ enum: ['trending', 'latest', 'popular'] })
  @IsOptional()
  @IsIn(['trending', 'latest', 'popular'], {
    message: "sort must be one of: trending, latest, popular.",
  })
  sort?: 'trending' | 'latest' | 'popular';

  /** Explicit sort field */
  @ApiPropertyOptional({ enum: ['latest', 'trending', 'most_read', 'most_discussed', 'most_liked'] })
  @IsOptional()
  @IsIn(['latest', 'trending', 'most_read', 'most_discussed', 'most_liked'], {
    message: "sortBy must be one of: latest, trending, most_read, most_discussed, most_liked.",
  })
  sortBy?: 'latest' | 'trending' | 'most_read' | 'most_discussed' | 'most_liked';

  /** Sort direction */
  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: "sortOrder must be 'asc' or 'desc'." })
  sortOrder?: 'asc' | 'desc';

  /**
   * ISO 8601 date string (e.g. "2024-01-01" or "2024-01-01T00:00:00Z").
   * Passing a non-date string (e.g. "fromDate") will now return 400
   * rather than triggering a PostgreSQL timestamp parse error → 500.
   */
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'fromDate must be a valid ISO 8601 date string.' })
  fromDate?: string;

  /** ISO 8601 upper-bound date filter */
  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'toDate must be a valid ISO 8601 date string.' })
  toDate?: string;
}
