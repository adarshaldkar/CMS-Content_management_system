import { forwardRef, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.schema';
import { PostgresService } from './postgres.service';
import { DatabaseSwitcherService } from './database-switcher.service';
import { DatabaseSwitcherController } from './database-switcher.controller';
import { AuditModule } from '../modules/audit/audit.module';

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
  providers: [PostgresService, DatabaseSwitcherService],
  exports: [PostgresService, DatabaseSwitcherService, MongooseModule],
})
export class DatabaseModule {}
