import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole, type AuthUser } from '../../domain/models';

export interface OwnableResource {
  authorId?: string;
  userId?: string;
  uploadedBy?: string;
}

@Injectable()
export class OwnershipHelper {
  static verifyOwnership(
    user: AuthUser,
    resource: OwnableResource,
    anyPermissionGranted = false,
  ): boolean {
    // 1. Super Admin and Admin with any-permission bypass ownership
    if (user.role === UserRole.SUPER_ADMIN || anyPermissionGranted) {
      return true;
    }

    // 2. Check author/owner ID against current authenticated user ID
    const resourceOwnerId =
      resource.authorId || resource.userId || resource.uploadedBy;

    if (!resourceOwnerId || resourceOwnerId !== user.id) {
      throw new ForbiddenException(
        'Forbidden: You do not have permission to modify another user’s resource.',
      );
    }

    return true;
  }
}
