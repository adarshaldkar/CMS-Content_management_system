import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseSwitcherService } from './database-switcher.service';
import { MultiDatabaseMeshService, type DatabaseEngine } from './multi-database-mesh.service';
import { PostgresService } from './postgres.service';
import { MariaDbService } from './mariadb.service';
import { MySqlService } from './mysql.service';
import { CockroachDbService } from './cockroach.service';
import { RedisService } from '../redis/redis.service';
import { UserRole, type AuthUser } from '../domain/models';

export const MESH_FAILOVER_CHAIN: DatabaseEngine[] = [
  'postgres',   // 1. Primary ACID Relational Core
  'mongodb',    // 2. Secondary Document Store
  'mariadb',    // 3. Tertiary Enterprise Relational SQL Store
  'mysql',      // 4. Quaternary Relational SQL Store
  'cockroach',  // 5. Quinary Distributed Scale-Out SQL Store
];

const SYSTEM_FAILOVER_ACTOR: AuthUser = {
  id: 'system-auto-failover-sentinel',
  email: 'system-failover@gazette.internal',
  name: 'Automatic Failover Sentinel',
  role: UserRole.SUPER_ADMIN,
  isActive: true,
  permissions: [],
};

@Injectable()
export class AutoFailoverService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AutoFailoverService.name);
  private timer: NodeJS.Timeout | null = null;
  private consecutiveActiveFailures = 0;
  private consecutivePrimaryRecoveries = 0;
  private isProcessing = false;
  private manualOverride: DatabaseEngine | null = null;

  constructor(
    private readonly switcher: DatabaseSwitcherService,
    private readonly mesh: MultiDatabaseMeshService,
    private readonly postgres: PostgresService,
    private readonly mariadb: MariaDbService,
    private readonly mysql: MySqlService,
    private readonly cockroach: CockroachDbService,
    private readonly redisService: RedisService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('🛡️ AutoFailoverService started: Continuous high-availability health probe active across 5 engines.');

    // Listen for manual admin switches via Redis Pub/Sub
    this.redisService.subscribe('cms:channel:mesh_switch', (rawMessage) => {
      try {
        const event = JSON.parse(rawMessage);
        if (event?.targetDb) {
          if (event.switchedBy !== 'system-auto-failover-sentinel') {
            // Admin explicitly switched: set manual override so auto-failback does not fight them
            this.manualOverride = event.targetDb === 'postgres' ? null : event.targetDb;
            this.consecutiveActiveFailures = 0;
            this.consecutivePrimaryRecoveries = 0;
            this.logger.log(
              `[AutoFailover] Manual override updated to: ${this.manualOverride ?? 'NONE (PostgreSQL Primary Priority)'}`,
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(`[AutoFailover] Error parsing switch event: ${err.message}`);
      }
    });

    this.timer = setInterval(() => {
      void this.checkAndFailover();
    }, 5000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getStatus() {
    return {
      enabled: true,
      priorityChain: MESH_FAILOVER_CHAIN,
      manualOverride: this.manualOverride,
      consecutiveActiveFailures: this.consecutiveActiveFailures,
    };
  }

  public resetManualOverride(): void {
    this.manualOverride = null;
    this.consecutiveActiveFailures = 0;
    this.consecutivePrimaryRecoveries = 0;
    this.logger.log('[AutoFailover] Manual override cleared. Auto-failback and primary priority restored.');
  }

  async probeEngine(engine: DatabaseEngine): Promise<boolean> {
    const timeout = <T>(promise: Promise<T>, ms = 1500): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Probe timeout')), ms)),
      ]);

    try {
      switch (engine) {
        case 'postgres':
          await timeout(this.postgres.pool.query('SELECT 1'));
          return true;
        case 'mongodb':
          if (this.mongoConnection.readyState !== 1) {
            try {
              await timeout(this.mongoConnection.asPromise(), 1500);
            } catch {}
          }
          if (this.mongoConnection.readyState === 1 && this.mongoConnection.db) {
            await timeout((this.mongoConnection.db as any).command({ ping: 1 }));
            return true;
          }
          return false;
        case 'mariadb':
          await timeout(this.mariadb.pool.query('SELECT 1'));
          return true;
        case 'mysql':
          await timeout(this.mysql.pool.query('SELECT 1'));
          return true;
        case 'cockroach':
          await timeout(this.cockroach.pool.query('SELECT 1'));
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  async checkAndFailover(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const active = (process.env.ACTIVE_DATABASE as DatabaseEngine) || this.mesh.getActiveEngine();
      const isActiveUp = await this.probeEngine(active);

      if (!isActiveUp) {
        this.consecutiveActiveFailures++;
        this.logger.warn(
          `⚠️ Active database [${active.toUpperCase()}] unreachable (${this.consecutiveActiveFailures}/2).`,
        );

        if (this.consecutiveActiveFailures >= 2) {
          // If active is down, CLEAR any manual override because the selected target has failed!
          if (this.manualOverride) {
            this.logger.warn(`Active database [${active}] under manual override has crashed! Resetting override.`);
            this.manualOverride = null;
          }

          // Identify next healthy candidate in priority order
          for (const candidate of MESH_FAILOVER_CHAIN) {
            if (candidate === active) continue;
            const isCandidateUp = await this.probeEngine(candidate);
            if (isCandidateUp) {
              this.logger.warn(
                `🚨 [AUTOMATIC FAILOVER ENGAGED] Active database [${active.toUpperCase()}] is DOWN! Automatically promoting [${candidate.toUpperCase()}] to active store.`,
              );
              try {
                await this.switcher.switchDatabase(candidate, SYSTEM_FAILOVER_ACTOR);
                this.consecutiveActiveFailures = 0;
                this.logger.log(
                  `✅ [AUTOMATIC FAILOVER COMPLETED] System zero-downtime promoted to [${candidate.toUpperCase()}].`,
                );
                break;
              } catch (err: any) {
                this.logger.error(`Failed to switch to failover candidate [${candidate}]: ${err.message}`);
              }
            }
          }
        }
      } else {
        // Active engine is healthy
        this.consecutiveActiveFailures = 0;

        // If an administrator explicitly selected an engine, respect their selection
        if (this.manualOverride && this.manualOverride === active) {
          this.consecutivePrimaryRecoveries = 0;
          return;
        }

        // Self-Healing Failback: Check if a higher-priority engine in the chain is back online
        const activeIndex = MESH_FAILOVER_CHAIN.indexOf(active);
        if (activeIndex > 0) {
          // e.g. currently on mongodb (idx 1), check if postgres (idx 0) is back up
          for (let i = 0; i < activeIndex; i++) {
            const higherEngine = MESH_FAILOVER_CHAIN[i];
            const isHigherUp = await this.probeEngine(higherEngine);
            if (isHigherUp) {
              this.consecutivePrimaryRecoveries++;
              if (this.consecutivePrimaryRecoveries >= 2) {
                this.logger.log(
                  `🔄 [SELF-HEALING FAILBACK] Primary engine [${higherEngine.toUpperCase()}] recovered and verified healthy! Restoring active database to [${higherEngine.toUpperCase()}].`,
                );
                try {
                  await this.switcher.switchDatabase(higherEngine, SYSTEM_FAILOVER_ACTOR);
                  this.consecutivePrimaryRecoveries = 0;
                  break;
                } catch (err: any) {
                  this.logger.warn(`Failback switch to ${higherEngine} deferred: ${err.message}`);
                }
              }
              break;
            } else {
              this.consecutivePrimaryRecoveries = 0;
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error during auto-failover cycle: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  async triggerImmediateFailover(): Promise<void> {
    this.consecutiveActiveFailures = 2;
    await this.checkAndFailover();
  }
}
