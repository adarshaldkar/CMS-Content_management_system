import type { Follow, CreateFollowDto, FollowQueryFilters, FollowTargetType } from '../../domain/models';
import type { PaginatedResult } from '../../domain/models';

export const FOLLOW_REPOSITORY = 'FOLLOW_REPOSITORY';

export interface IFollowRepository {
  findOne(followerId: string, targetType: FollowTargetType, targetId: string): Promise<Follow | null>;
  findMany(filters: FollowQueryFilters): Promise<PaginatedResult<Follow>>;
  create(dto: CreateFollowDto): Promise<Follow>;
  delete(followerId: string, targetType: FollowTargetType, targetId: string): Promise<boolean>;
  countFollowers(targetType: FollowTargetType, targetId: string): Promise<number>;
  countFollowing(followerId: string, targetType: FollowTargetType): Promise<number>;
}
