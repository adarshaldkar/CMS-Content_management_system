import { forwardRef, Global, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.schema';
import { PostgresService } from './postgres.service';
import { MariaDbService } from './mariadb.service';
import { MySqlService } from './mysql.service';
import { CockroachDbService } from './cockroach.service';
import { ClickHouseService } from './clickhouse.service';
import { MultiDatabaseMeshService } from './multi-database-mesh.service';
import { DatabaseSwitcherService } from './database-switcher.service';
import { DatabaseSwitcherController } from './database-switcher.controller';
import { AuditModule } from '../modules/audit/audit.module';
import { RepositoryRegistryService } from '../repositories/repository-registry.service';

import { AutoFailoverService } from './auto-failover.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const uri = config.get('MONGO_URI', { infer: true });

        return {
          uri,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          lazyConnection: true,
          bufferCommands: true,

          autoIndex: false,
          connectionFactory: (connection: any) => {
            connection.on('error', () => {
              // Gracefully handle idle TLS/network hiccups without crashing Node
            });
            return connection;
          },
        };
      },
    }),
    forwardRef(() => AuditModule),
  ],
  controllers: [DatabaseSwitcherController],
  providers: [
    PostgresService,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    ClickHouseService,
    MultiDatabaseMeshService,
    DatabaseSwitcherService,
    AutoFailoverService,
    RepositoryRegistryService,
  ],
  exports: [
    PostgresService,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    ClickHouseService,
    MultiDatabaseMeshService,
    DatabaseSwitcherService,
    AutoFailoverService,
    MongooseModule,
    RepositoryRegistryService,
  ],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    private readonly registry: RepositoryRegistryService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  onModuleInit() {
    const initialActive = this.config.get('ACTIVE_DATABASE', { infer: true });
    this.registry.setInitialActive(initialActive);
  }
}
