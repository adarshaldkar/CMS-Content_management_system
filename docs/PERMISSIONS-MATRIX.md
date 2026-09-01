# Granular Role-Based Access Control (RBAC) Matrix
## Permission & Capability Specification

---

## 1. System Roles

The application enforces a hierarchical 5-tier role system:

1. **SUPER_ADMIN**: Full system control, database switching, audit log purging, global permissions.
2. **ADMIN**: User management, taxonomy management, editorial overrides, system settings.
3. **EDITOR**: Content moderation, review queue, publishing, scheduling, tag/category management.
4. **AUTHOR**: Create, edit, and manage own articles and media; submit articles for review.
5. **USER**: Public profile, bookmarking, commenting, reading articles.

---

## 2. Granular Capabilities Matrix

| Capability / Permission Token | Description | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER | GUEST |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Article Management** | | | | | | | |
| `article:read:published` | Read any published article | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `article:read:draft:own` | Read own draft/submitted articles | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article:read:draft:any` | View any draft or submitted article | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `article:create` | Create a new article draft | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article:update:own` | Edit own article (Draft/Rejected only)| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article:update:any` | Edit any article at any time | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `article:submit` | Submit own draft for review | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article:review` | Approve or reject pending articles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `article:publish` | Publish approved articles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `article:archive` | Archive published articles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `article:delete:own` | Soft-delete own draft articles | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article:delete:any` | Soft-delete any article | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Taxonomy & Categories** | | | | | | | |
| `category:read` | View categories | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `category:create` | Create new category | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `category:update` | Edit category & SEO metadata | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `category:delete` | Delete category (dependency checked)| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `tag:manage` | Create, rename, delete tags | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Media Library** | | | | | | | |
| `media:upload` | Upload images/attachments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `media:read:own` | View own uploaded media assets | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `media:read:all` | View global media library | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `media:delete:own` | Delete own uploaded media | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `media:delete:any` | Delete any media asset in library | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User & Access Management**| | | | | | | |
| `user:read:profile` | View public author/user profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user:update:self` | Update own name, bio, avatar, pass | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `user:list:admin` | View all users, roles, and statuses| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user:update:role` | Change another user's role | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user:deactivate` | Ban or deactivate user account | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user:delete` | Soft-delete user record | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Comments & Interactions** | | | | | | | |
| `comment:create` | Post comment on published article | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `comment:delete:own` | Delete own comment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `comment:moderate` | Delete or hide any user comment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `bookmark:manage` | Add or remove personal bookmarks | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **System & Administration** | | | | | | | |
| `audit:read` | View security & operational audit logs| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `database:view_status` | View active database status | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `database:switch` | Switch active DB (Postgres ↔ Mongo)| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system:settings:update` | Update global platform settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Server-Side Guard Implementation Pattern (NestJS)

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // Deny by default should be handled at route decorator level
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Super Admin bypasses all checks
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const hasPermission = requiredPermissions.every((perm) =>
      user.permissions?.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        message: 'You do not have permission to perform this action.',
        required: requiredPermissions,
      });
    }

    return true;
  }
}
```
