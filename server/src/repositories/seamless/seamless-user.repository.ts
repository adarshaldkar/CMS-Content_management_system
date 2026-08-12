import { Logger } from '@nestjs/common';
import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';
import type { IUserRepository } from '../interfaces/user.repository.interface';

/**
 * SeamlessUserRepository
 *
 * Wraps the primary (active) user repository and secondary (peer) user repository.
 * When a user is queried on the active database and not found (e.g. after a DB switch),
 * it queries the peer database. If found, it automatically replicates the user into
 * the active database so authentication and workflows continue with zero disruption.
 */
export class SeamlessUserRepository implements IUserRepository {
  private readonly logger = new Logger(SeamlessUserRepository.name);

  constructor(
    private readonly activeRepo: IUserRepository,
    private readonly peerRepo: IUserRepository,
    private readonly activeDbName: string,
    private readonly peerDbName: string,
  ) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.activeRepo.findById(id);
    if (user) return user;

    try {
      const peerUser = await this.peerRepo.findById(id);
      if (peerUser) {
        this.logger.log(
          `[Seamless Sync] JIT replicating user ${peerUser.email} from ${this.peerDbName} to ${this.activeDbName} by ID`,
        );
        return await this.activeRepo.create({
          email: peerUser.email,
          name: peerUser.name,
          passwordHash: peerUser.passwordHash || '',
          bio: peerUser.bio,
          avatarUrl: peerUser.avatarUrl,
          preferredTopics: peerUser.preferredTopics || [],
          role: peerUser.role,
          isActive: peerUser.isActive,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.activeRepo.findByEmail(email);
    if (user) return user;

    try {
      const peerUser = await this.peerRepo.findByEmail(email);
      if (peerUser) {
        this.logger.log(
          `[Seamless Sync] JIT replicating user ${peerUser.email} from ${this.peerDbName} to ${this.activeDbName} on login`,
        );
        return await this.activeRepo.create({
          email: peerUser.email,
          name: peerUser.name,
          passwordHash: peerUser.passwordHash || '',
          bio: peerUser.bio,
          avatarUrl: peerUser.avatarUrl,
          preferredTopics: peerUser.preferredTopics || [],
          role: peerUser.role,
          isActive: peerUser.isActive,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by Email failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    return this.activeRepo.findMany(filters);
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.activeRepo.create(data);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.activeRepo.update(id, data);
  }

  async softDelete(id: string): Promise<boolean> {
    return this.activeRepo.softDelete(id);
  }
}
