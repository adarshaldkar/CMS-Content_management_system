import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../repositories/interfaces/user.repository.interface';
import {
  AuditEventType,
  UserRole,
  type AuthUser,
  type PaginatedResult,
  type User,
  type UserQueryFilters,
} from '../../domain/models';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    return this.userRepo.findMany(filters);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async updateRole(
    userId: string,
    newRole: UserRole,
    actor: AuthUser,
  ): Promise<User> {
    const targetUser = await this.findById(userId);

    // Strict Privilege Boundaries:
    // 1. Only SUPER_ADMIN can grant or revoke SUPER_ADMIN
    if (newRole === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only Super Administrators can assign the SUPER_ADMIN role.',
      );
    }

    if (
      targetUser.role === UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Administrators cannot modify Super Administrator accounts.',
      );
    }

    // 2. An admin cannot change their own role to lock themselves out
    if (actor.id === userId && newRole !== actor.role) {
      throw new ForbiddenException(
        'Self-role modification is prohibited to maintain administrative continuity.',
      );
    }

    const previousRole = targetUser.role;
    const updated = await this.userRepo.update(userId, { role: newRole });

    await this.auditService.log({
      actorId: actor.id,
      action: AuditEventType.ROLE_CHANGED,
      resource: `User:${userId}`,
      result: 'SUCCESS',
      metadata: { previousRole, newRole, targetEmail: targetUser.email },
    });

    return updated;
  }

  async updateStatus(
    userId: string,
    isActive: boolean,
    actor: AuthUser,
  ): Promise<User> {
    const targetUser = await this.findById(userId);

    if (actor.id === userId && !isActive) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }

    if (
      targetUser.role === UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Administrators cannot deactivate Super Administrator accounts.',
      );
    }

    const updated = await this.userRepo.update(userId, { isActive });

    await this.auditService.log({
      actorId: actor.id,
      action: AuditEventType.STATUS_CHANGED,
      resource: `User:${userId}`,
      result: 'SUCCESS',
      metadata: { previousStatus: targetUser.isActive, newStatus: isActive },
    });

    return updated;
  }
}
