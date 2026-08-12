import { Injectable, Logger } from '@nestjs/common';
import { IRuntimeSwitchableRepository, SupportedDbName } from './repository-proxy';

/**
 * RepositoryRegistryService
 *
 * Singleton registry that knows about every runtime-switchable repository proxy.
 * When `DatabaseSwitcherService` completes a successful DB healthcheck, it calls
 * `switchAllTo(target)` to atomically re-point all repository proxies at the
 * newly chosen active database. Because each proxy is a single object (not NestJS
 * scope-resolution), there is no need to re-resolve the injector tree.
 */
@Injectable()
export class RepositoryRegistryService {
  private readonly logger = new Logger(RepositoryRegistryService.name);
  private readonly proxies: Set<IRuntimeSwitchableRepository> = new Set();
  private current: SupportedDbName = 'postgres';

  setInitialActive(db: SupportedDbName) {
    this.current = db;
  }

  register(proxy: IRuntimeSwitchableRepository): void {
    proxy.__switchActive(this.current);
    this.proxies.add(proxy);
  }

  switchAllTo(target: SupportedDbName): { switched: number; previous: SupportedDbName } {
    const previous = this.current;
    if (previous === target) {
      return { switched: 0, previous };
    }
    let switched = 0;
    for (const proxy of this.proxies) {
      try {
        proxy.__switchActive(target);
        switched += 1;
      } catch (err) {
        this.logger.error(
          `[Registry] Failed to switch proxy: ${(err as Error).message}. Attempting rollback.`,
        );
        for (const p of this.proxies) p.__switchActive(previous);
        throw err;
      }
    }
    this.current = target;
    this.logger.log(
      `[Registry] All ${switched} repository proxies rebinded ${previous} → ${target}.`,
    );
    return { switched, previous };
  }

  active(): SupportedDbName {
    return this.current;
  }
}
