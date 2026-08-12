import { forwardRef, Global, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.schema';
import { PostgresService } from './postgres.service';
import { DatabaseSwitcherService } from './database-switcher.service';
import { DatabaseSwitcherController } from './database-switcher.controller';
import { AuditModule } from '../modules/audit/audit.module';
import { RepositoryRegistryService } from '../repositories/repository-registry.service';

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
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          retryAttempts: 3,
          retryDelay: 1000,
          bufferCommands: true,
          autoIndex: true,
        };
      },
    }),
    forwardRef(() => AuditModule),
  ],
  controllers: [DatabaseSwitcherController],
  providers: [PostgresService, DatabaseSwitcherService, RepositoryRegistryService],
  exports: [PostgresService, DatabaseSwitcherService, MongooseModule, RepositoryRegistryService],
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
