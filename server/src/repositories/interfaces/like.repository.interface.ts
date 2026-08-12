import type { Like, CreateLikeDto } from '../../domain/models';

export const LIKE_REPOSITORY = 'LIKE_REPOSITORY';

export interface ILikeRepository {
  findOne(userId: string, articleId: string): Promise<Like | null>;
  create(dto: CreateLikeDto): Promise<Like>;
  delete(userId: string, articleId: string): Promise<boolean>;
  countByArticle(articleId: string): Promise<number>;
}
