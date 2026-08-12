import type { IArticleRepository } from './interfaces/article.repository.interface';
import type { ICategoryRepository } from './interfaces/category.repository.interface';
import type { IUserRepository } from './interfaces/user.repository.interface';
import type { ISessionRepository } from './interfaces/session.repository.interface';
import type { IAuditLogRepository } from './interfaces/audit-log.repository.interface';
import type { IRevisionRepository } from './interfaces/revision.repository.interface';
import type { IMediaRepository } from './interfaces/media.repository.interface';

export type SupportedDbName = 'postgres' | 'mongodb';

export interface IRuntimeSwitchableRepository {
  /** Swap the active repository implementation pointer in-process (no DI re-resolution). */
  __switchActive(target: SupportedDbName): void;
  /** Name of currently active underlying database pointer. */
  __activeDb(): SupportedDbName;
}

type AnyRepository =
  | IArticleRepository
  | ICategoryRepository
  | IUserRepository
  | ISessionRepository
  | IAuditLogRepository
  | IRevisionRepository
  | IMediaRepository;

/**
 * RepositoryProxy<TRepo>
 *
 * A nest-injectable singleton that wraps two pre-built Seamless* configurations
 * (one for postgres-active, one for mongodb-active) and delegates every method
 * call to whichever is currently active.
 *
 * DatabaseSwitcherService calls `__switchActive(target)` AFTER the healthcheck on
 * the target DB has passed — this performs an atomic pointer swap (reads and writes
 * that land after this call route to the new repository; in-flight calls continue
 * against the old delegate, matching the "at-most-once semantic per request").
 */
export class RepositoryProxy<TRepo extends AnyRepository> implements IRuntimeSwitchableRepository {
  private readonly postgresDelegate: TRepo;
  private readonly mongoDelegate: TRepo;
  private currentDelegate: TRepo;
  private _active: SupportedDbName;

  constructor(
    postgresDelegate: TRepo,
    mongoDelegate: TRepo,
    initialActive: SupportedDbName,
  ) {
    this.postgresDelegate = postgresDelegate;
    this.mongoDelegate = mongoDelegate;
    this._active = initialActive;
    this.currentDelegate = initialActive === 'postgres' ? postgresDelegate : mongoDelegate;
  }

  __switchActive(target: SupportedDbName): void {
    this._active = target;
    this.currentDelegate = target === 'postgres' ? this.postgresDelegate : this.mongoDelegate;
  }

  __activeDb(): SupportedDbName {
    return this._active;
  }
}

/**
 * Creates a proxy class (not an instance) that extends RepositoryProxy and
 * dispatches every concrete interface method to `this.currentDelegate`.
 *
 * Using a generated subclass avoids `new Proxy()` traps that break with NestJS DI
 * metadata for injections. TypeScript interfaces cannot be implemented at runtime,
 * so we generate method dispatchers for all methods known to be used across the
 * 7 repository interfaces.
 */
export function makeDispatchProxyClass<TRepo extends AnyRepository>(
  methods: string[],
): new (pg: TRepo, mg: TRepo, initial: SupportedDbName) => RepositoryProxy<TRepo> & TRepo {
  class ConcreteProxy extends RepositoryProxy<TRepo> {}
  for (const method of methods) {
    (ConcreteProxy.prototype as any)[method] = function (this: ConcreteProxy, ...args: any[]) {
      const delegate = (this as any).currentDelegate as TRepo;
      return (delegate as any)[method](...args);
    };
  }
  return ConcreteProxy as any;
}

/** Union of method names from all 7 repository interfaces. Each list exactly matches the corresponding interface to guarantee full dispatch coverage. */
export const REPO_METHODS_BY_TYPE: Record<string, string[]> = {
  article: [
    'findById',
    'findBySlug',
    'findMany',
    'create',
    'update',
    'softDelete',
    'updateStatus',
  ],
  category: ['findById', 'findBySlug', 'findMany', 'create', 'update', 'softDelete'],
  user: ['findById', 'findByEmail', 'findMany', 'create', 'update', 'softDelete'],
  session: [
    'create',
    'findById',
    'rotateAtomic',
    'revokeFamily',
    'revokeAllUserSessions',
  ],
  audit: ['create', 'findRecent'],
  revision: ['create', 'findByArticleId', 'findById'],
  media: ['create', 'findById', 'findMany', 'delete'],
};
