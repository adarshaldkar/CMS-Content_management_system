import type { IArticleRepository } from './interfaces/article.repository.interface';
import type { ICategoryRepository } from './interfaces/category.repository.interface';
import type { IUserRepository } from './interfaces/user.repository.interface';
import type { ISessionRepository } from './interfaces/session.repository.interface';
import type { IAuditLogRepository } from './interfaces/audit-log.repository.interface';
import type { IRevisionRepository } from './interfaces/revision.repository.interface';
import type { IMediaRepository } from './interfaces/media.repository.interface';

export type SupportedDbName =
  | 'postgres'
  | 'mongodb'
  | 'mariadb'
  | 'mysql'
  | 'cockroach'
  | 'clickhouse';

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
 * An injectable singleton that wraps pre-built delegates for all 6 engines
 * (PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB, ClickHouse) and delegates
 * every method call to whichever engine is currently active.
 */
export class RepositoryProxy<TRepo extends AnyRepository> implements IRuntimeSwitchableRepository {
  private readonly delegates: Partial<Record<SupportedDbName, TRepo>>;
  private currentDelegate: TRepo;
  private _active: SupportedDbName;

  constructor(
    delegatesOrPg: Partial<Record<SupportedDbName, TRepo>> | TRepo,
    mongoOrInitial?: TRepo | SupportedDbName,
    initialActive: SupportedDbName = 'postgres',
  ) {
    if (typeof delegatesOrPg === 'object' && delegatesOrPg !== null && !('findById' in delegatesOrPg || 'create' in delegatesOrPg)) {
      this.delegates = delegatesOrPg as Partial<Record<SupportedDbName, TRepo>>;
      this._active = (mongoOrInitial as SupportedDbName) || 'postgres';
    } else {
      // Legacy signature compatibility (pg, mg, initial)
      this.delegates = {
        postgres: delegatesOrPg as TRepo,
        mongodb: mongoOrInitial as TRepo,
      };
      this._active = initialActive;
    }
    this.currentDelegate = (this.delegates[this._active] || this.delegates.postgres || this.delegates.mongodb)!;
  }

  __switchActive(target: SupportedDbName): void {
    this._active = target;
    if (this.delegates[target]) {
      this.currentDelegate = this.delegates[target]!;
    }
  }

  __activeDb(): SupportedDbName {
    return this._active;
  }
}

/**
 * Creates a proxy class (not an instance) that extends RepositoryProxy and
 * dispatches every concrete interface method to `this.currentDelegate`.
 */
export function makeDispatchProxyClass<TRepo extends AnyRepository>(
  methods: string[],
): new (
  delegatesOrPg: Partial<Record<SupportedDbName, TRepo>> | TRepo,
  mongoOrInitial?: TRepo | SupportedDbName,
  initial?: SupportedDbName,
) => RepositoryProxy<TRepo> & TRepo {
  class ConcreteProxy extends RepositoryProxy<TRepo> {}
  for (const method of methods) {
    (ConcreteProxy.prototype as any)[method] = function (this: ConcreteProxy, ...args: any[]) {
      const delegate = (this as any).currentDelegate as TRepo;
      return (delegate as any)[method](...args);
    };
  }
  return ConcreteProxy as any;
}

/** Union of method names from all 7 repository interfaces. */
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
