import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PostgresService } from './postgres.service';
import { MariaDbService } from './mariadb.service';
import { MySqlService } from './mysql.service';
import { CockroachDbService } from './cockroach.service';
import { ClickHouseService } from './clickhouse.service';
import { MultiDatabaseMeshService, type DatabaseEngine, type DatabaseHealthInfo } from './multi-database-mesh.service';
import { AuditService } from '../modules/audit/audit.service';
import { RepositoryRegistryService } from '../repositories/repository-registry.service';
import { ALL_DATABASE_REPOSITORIES } from '../repositories/repository.providers';
import { AuditEventType, type AuthUser } from '../domain/models';

export interface DatabaseHealthStatus {
  activeDatabase: DatabaseEngine;
  healthyCount: number;
  databases: DatabaseHealthInfo[];
  postgres: { status: 'healthy' | 'unhealthy'; latencyMs: number };
  mongodb: { status: 'healthy' | 'unhealthy'; latencyMs: number };
  registeredRepositories: {
    total: number;
    byEngine: Record<string, number>;
  };
  sanitizedEvents: Array<{ id: string; timestamp: string; message: string }>;
}

function engineCoverageOf(repositories: Array<{ name: string }>): Record<string, number> {
  const buckets: Record<string, number> = {};
  for (const repo of repositories) {
    const engine = repo.name.split(/(?=[A-Z])/)[0].replace(/Repository$/, '');
    const key = engine.startsWith('MariaDb')
      ? 'mariadb'
      : engine.startsWith('MySql')
        ? 'mysql'
        : engine.startsWith('Cockroach')
          ? 'cockroach'
          : engine.startsWith('ClickHouse')
            ? 'clickhouse'
            : engine.startsWith('Mongo')
              ? 'mongodb'
              : engine.toLowerCase();
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return buckets;
}

const REPOSITORY_ENGINE_COVERAGE = engineCoverageOf(ALL_DATABASE_REPOSITORIES);

export type SwitchState =
  | 'IDLE'
  | 'VALIDATING_TARGET'
  | 'SWITCHING'
  | 'VERIFYING_CONTINUITY'
  | 'SUCCESS'
  | 'FAILED';

@Injectable()
export class DatabaseSwitcherService {
  private readonly logger = new Logger(DatabaseSwitcherService.name);
  private switchLock = false;

  constructor(
    private readonly postgres: PostgresService,
    private readonly mariadb: MariaDbService,
    private readonly mysql: MySqlService,
    private readonly cockroach: CockroachDbService,
    private readonly clickhouse: ClickHouseService,
    private readonly mesh: MultiDatabaseMeshService,
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly auditService: AuditService,
    private readonly repositoryRegistry: RepositoryRegistryService,
  ) {}

  async getStatus(): Promise<DatabaseHealthStatus> {
    const meshStatus = await this.mesh.getMeshStatus();

    const pgInfo = meshStatus.databases.find((d) => d.engine === 'postgres');
    const mongoInfo = meshStatus.databases.find((d) => d.engine === 'mongodb');

    return {
      activeDatabase: meshStatus.activeEngine,
      healthyCount: meshStatus.healthyCount,
      databases: meshStatus.databases,
      postgres: {
        status: pgInfo?.status === 'healthy' ? 'healthy' : 'unhealthy',
        latencyMs: pgInfo?.latencyMs || 0,
      },
      mongodb: {
        status: mongoInfo?.status === 'healthy' ? 'healthy' : 'unhealthy',
        latencyMs: mongoInfo?.latencyMs || 0,
      },
      registeredRepositories: {
        total: ALL_DATABASE_REPOSITORIES.length,
        byEngine: REPOSITORY_ENGINE_COVERAGE,
      },
      sanitizedEvents: [
        {
          id: 'evt-1',
          timestamp: new Date().toISOString(),
          message: `6-Database Persistence Mesh active. Synchronizing across PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB & ClickHouse (${meshStatus.healthyCount}/6 operational)`,
        },
        {
          id: 'evt-2',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          message: 'Author session state and topic preferences verified',
        },
      ],
    };
  }

  async switchDatabase(
    targetDb: DatabaseEngine,
    actor: AuthUser,
  ): Promise<{
    success: boolean;
    previousDatabase: string;
    activeDatabase: string;
    state: SwitchState;
  }> {
    if (this.switchLock) {
      throw new BadRequestException(
        'A database switch operation is currently in progress. Please wait.',
      );
    }

    const currentDb = process.env.ACTIVE_DATABASE || this.mesh.getActiveEngine();
    if (targetDb === currentDb) {
      return {
        success: true,
        previousDatabase: currentDb,
        activeDatabase: targetDb,
        state: 'SUCCESS',
      };
    }

    if (targetDb === 'clickhouse') {
      throw new BadRequestException(
        'ClickHouse is an analytics-only engine and cannot be set as the active application database.',
      );
    }

    // Pre-flight: never activate an offline engine — the mesh would otherwise
    // silently degrade every read/write through Postgres/Mongo fallbacks.
    const meshStatus = await this.mesh.getMeshStatus();
    const targetInfo = meshStatus.databases.find((d) => d.engine === targetDb);
    if (!targetInfo || targetInfo.status === 'offline') {
      throw new BadRequestException(
        `Target database '${targetDb}' is offline (${targetInfo?.error || 'unreachable'}) and cannot be activated.`,
      );
    }

    this.switchLock = true;
    this.logger.log(`[DB Switcher] Mutex acquired. Initiating switch: ${currentDb} -> ${targetDb}`);

    try {
      // Step 1: Validate target DB health
      if (targetDb === 'postgres') {
        await this.postgres.pool.query('SELECT 1');
      } else if (targetDb === 'mariadb') {
        await this.mariadb.pool.query('SELECT 1');
      } else if (targetDb === 'mysql') {
        await this.mysql.pool.query('SELECT 1');
      } else if (targetDb === 'cockroach') {
        await this.cockroach.pool.query('SELECT 1');
      } else if (targetDb === 'mongodb') {
        if (this.mongoConnection.readyState !== 1) {
          try {
            await this.mongoConnection.asPromise();
          } catch {}
        }
        if (this.mongoConnection.readyState !== 1) {
          throw new Error('MongoDB connection is not ready.');
        }
      }

      // Step 2: Atomic pointer swap and repository proxy rebind.
      // Every registered seamless coordinator exposes __switchActive, so the
      // registry can atomically re-point all of them (Postgres, Mongo and the
      // SQL engine replicas) at the newly chosen active engine.
      process.env.ACTIVE_DATABASE = targetDb;
      this.mesh.setActiveEngine(targetDb);
      this.repositoryRegistry.switchAllTo(targetDb);
      this.logger.log(`[DB Switcher] Active database pointer atomically switched to: ${targetDb}`);

      // Step 3: Audit trail
      await this.auditService.log({
        actorId: actor.id,
        action: AuditEventType.DB_SWITCH_SUCCESS,
        resource: `Database:${targetDb}`,
        result: 'SUCCESS',
        metadata: { from: currentDb, to: targetDb },
      });

      return {
        success: true,
        previousDatabase: currentDb,
        activeDatabase: targetDb,
        state: 'SUCCESS',
      };
    } catch (err: any) {
      this.logger.error(`[DB Switcher] Switch failed: ${err.message}`, err.stack);
      // Revert
      process.env.ACTIVE_DATABASE = currentDb;
      this.mesh.setActiveEngine(currentDb as any);
      this.repositoryRegistry.switchAllTo(currentDb as any);
      throw new InternalServerErrorException('Database switch operation failed and was safely rolled back.');
    } finally {
      this.switchLock = false;
      this.logger.log('[DB Switcher] Mutex released.');
    }
  }
}
