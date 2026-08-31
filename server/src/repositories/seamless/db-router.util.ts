import type { SupportedDbName } from '../repository-proxy';

/**
 * Shared read-routing helpers for seamless coordinators.
 *
 * Every seamless repository holds a Postgres + Mongo pair (primary/secondary)
 * and, where available, MariaDB / MySQL / Cockroach read repositories. These
 * helpers resolve the single active read implementation based on
 * `process.env.ACTIVE_DATABASE` (the value the DatabaseSwitcherService sets).
 * ClickHouse is an analytics-only store and never serves application reads.
 */

export function activeEngine(): SupportedDbName {
  return (process.env.ACTIVE_DATABASE || 'postgres') as SupportedDbName;
}

export function postgresStoreOf<T>(primaryName: string, primaryRepo: T, secondaryRepo: T): T {
  return primaryName === 'postgres' ? primaryRepo : secondaryRepo;
}

export function mongoStoreOf<T>(primaryName: string, primaryRepo: T, secondaryRepo: T): T {
  return primaryName === 'mongodb' ? primaryRepo : secondaryRepo;
}

export function selectActiveReadRepo<T extends object>(
  primaryName: string,
  primaryRepo: T,
  secondaryRepo: T,
  mariadbRepo?: T,
  mysqlRepo?: T,
  cockroachRepo?: T,
  clickhouseRepo?: T,
): T {
  const active = activeEngine();
  switch (active) {
    case 'mongodb':
      return mongoStoreOf(primaryName, primaryRepo, secondaryRepo);
    case 'mariadb':
      return withEngineFailover(mariadbRepo, postgresStoreOf(primaryName, primaryRepo, secondaryRepo));
    case 'mysql':
      return withEngineFailover(mysqlRepo, postgresStoreOf(primaryName, primaryRepo, secondaryRepo));
    case 'cockroach':
      return withEngineFailover(cockroachRepo, postgresStoreOf(primaryName, primaryRepo, secondaryRepo));
    case 'clickhouse':
      return clickhouseRepo ?? postgresStoreOf(primaryName, primaryRepo, secondaryRepo);
    default:
      return postgresStoreOf(primaryName, primaryRepo, secondaryRepo);
  }
}

/**
 * Auto-failover wrapper for third-engine (MariaDB / MySQL / CockroachDB) active
 * reads and writes. If the routed SQL engine rejects a call — engine went
 * offline, schema missing, connection dropped — the call transparently retries
 * against the authoritative PostgreSQL main store instead of surfacing a 500.
 * PostgreSQL / MongoDB main stores are never wrapped: they are the baseline.
 * Proxies are memoised per engine-repository instance so routing stays cheap.
 */
const engineFailoverCache = new WeakMap<object, object>();

export function withEngineFailover<T extends object>(engineRepo: T | undefined, fallbackRepo: T): T {
  if (!engineRepo) return fallbackRepo;
  const cached = engineFailoverCache.get(engineRepo);
  if (cached !== undefined) return cached as T;

  const proxy = new Proxy(engineRepo, {
    get(target: any, prop: string | symbol, receiver: any): any {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original !== 'function') return original;

      return (...args: unknown[]) => {
        const retryOnFallback = () => {
          const fallbackFn = (fallbackRepo as any)[prop];
          if (typeof fallbackFn !== 'function') {
            throw new Error(`Engine failover: no '${String(prop)}' method on the PostgreSQL fallback store.`);
          }
          return fallbackFn.apply(fallbackRepo, args);
        };

        try {
          const result = original.apply(target, args);
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            return (result as Promise<unknown>).catch(() => retryOnFallback());
          }
          return result;
        } catch {
          return retryOnFallback();
        }
      };
    },
  });

  engineFailoverCache.set(engineRepo, proxy);
  return proxy;
}

/**
 * The main stores that must receive the entity once the active engine handled it.
 * When the active engine IS Postgres or Mongo only the other main store needs the
 * copy; when a third engine (MariaDB/MySQL/Cockroach) is active, BOTH main stores
 * must be kept in sync so no replica goes stale.
 */
export function shouldReplicateToPostgres(): boolean {
  return activeEngine() !== 'postgres';
}

export function shouldReplicateToMongo(): boolean {
  return activeEngine() !== 'mongodb';
}