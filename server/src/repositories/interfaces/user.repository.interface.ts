import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  softDelete(id: string): Promise<boolean>;
  // Password reset
  setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByPasswordResetToken(tokenHash: string): Promise<User | null>;
  clearPasswordResetToken(userId: string): Promise<void>;
  updatePassword(userId: string, newPasswordHash: string): Promise<void>;
}
