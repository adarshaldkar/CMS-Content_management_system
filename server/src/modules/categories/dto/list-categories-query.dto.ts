import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Validated query DTO for GET /api/categories
 *
 * Ensures that non-integer page/limit values (e.g. "page=page") returned
 * from ZAP schema-based fuzzing result in HTTP 400 rather than triggering
 * a PostgreSQL bigint cast error → HTTP 500.
 *
 * ZAP finding closed: GET /api/categories?page=page → "invalid input syntax for type bigint: NaN" → 500
 */
export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer.' })
  @Min(1, { message: 'page must be at least 1.' })
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer.' })
  @Min(1, { message: 'limit must be at least 1.' })
  @Max(200, { message: 'limit must not exceed 200.' })
  limit?: number = 50;

  @ApiPropertyOptional({ example: 'technology' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'search must not exceed 200 characters.' })
  @Matches(/^[^\u0000]*$/, {
    message: 'search contains invalid characters',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'] as const, {
    message: "status must be 'active' or 'inactive'.",
  })
  status?: 'active' | 'inactive';
}

