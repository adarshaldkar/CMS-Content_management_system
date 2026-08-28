/**
 * Domain Models Barrel Export
 *
 * Clean Architecture domain layer re-exporting modular domain models.
 */

export * from './common.model';
export * from './article.model';
export * from './user.model';
export * from './permissions.model';
export * from './session.model';
export * from './taxonomy.model';
export * from './media.model';
export * from './comment.model';
export * from './audit.model';
// Enum values from social model (must use regular export)
export { FollowTargetType } from './social.model';
// Type-only exports from social model
export type { Bookmark, CreateBookmarkDto, Like, CreateLikeDto, Follow, CreateFollowDto, FollowQueryFilters } from './social.model';
export * from './publishing-slot.model';


