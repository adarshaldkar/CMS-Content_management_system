import type { Comment, CommentQueryFilters, CreateCommentDto, UpdateCommentDto } from '../../domain/models';

export const COMMENT_REPOSITORY = 'COMMENT_REPOSITORY';

export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>;
  findMany(filters: CommentQueryFilters): Promise<Comment[]>;
  create(dto: CreateCommentDto & { authorId: string; authorName: string; authorAvatar: string | null }): Promise<Comment>;
  update(id: string, dto: UpdateCommentDto): Promise<Comment>;
  softDelete(id: string): Promise<boolean>;
  countByArticle(articleId: string): Promise<number>;
}
