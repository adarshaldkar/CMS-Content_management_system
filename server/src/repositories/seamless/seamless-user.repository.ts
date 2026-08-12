import { Logger } from '@nestjs/common';
import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';
import type { IUserRepository } from '../interfaces/user.repository.interface';

export class SeamlessUserRepository implements IUserRepository {
  private readonly logger = new Logger(SeamlessUserRepository.name);

  constructor(
    private readonly primaryRepo: IUserRepository,
    private readonly secondaryRepo: IUserRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
  ) {}

  public get activeDbName(): string {
    return this.primaryName;
  }

  public get peerDbName(): string {
    return this.secondaryName;
  }

  private get activeRepo(): IUserRepository {
    const active = process.env.ACTIVE_DATABASE || this.primaryName;
    if (active === 'mongodb') {
      return this.primaryName === 'mongodb' ? this.primaryRepo : this.secondaryRepo;
    }
    return this.primaryName === 'postgres' ? this.primaryRepo : this.secondaryRepo;
  }

  private get peerRepo(): IUserRepository {
    const active = process.env.ACTIVE_DATABASE || this.primaryName;
    if (active === 'mongodb') {
      return this.primaryName === 'mongodb' ? this.secondaryRepo : this.primaryRepo;
    }
    return this.primaryName === 'postgres' ? this.secondaryRepo : this.primaryRepo;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.activeRepo.findById(id);
    if (user) return user;

    try {
      const peerUser = await this.peerRepo.findById(id);
      if (peerUser) {
        this.logger.log(
          `[Seamless Sync] JIT replicating user ${peerUser.email} by ID`,
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
          `[Seamless Sync] JIT replicating user ${peerUser.email} on login`,
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
