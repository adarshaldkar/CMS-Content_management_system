import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  SessionSchemaClass,
  SessionSchema,
} from '../../repositories/mongo/session.schema';
import {
  UserSchemaClass,
  UserSchema,
} from '../../repositories/mongo/user.schema';
import { PostgresSessionRepository } from '../../repositories/postgres/postgres-session.repository';
import { MongoSessionRepository } from '../../repositories/mongo/mongo-session.repository';
import { PostgresUserRepository } from '../../repositories/postgres/postgres-user.repository';
import { MongoUserRepository } from '../../repositories/mongo/mongo-user.repository';
import {
  sessionRepositoryProvider,
  userRepositoryProvider,
} from '../../repositories/repository.providers';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: SessionSchemaClass.name, schema: SessionSchema },
      { name: UserSchemaClass.name, schema: UserSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PostgresService,
    PostgresSessionRepository,
    MongoSessionRepository,
    sessionRepositoryProvider,
    PostgresUserRepository,
    MongoUserRepository,
    userRepositoryProvider,
    JwtAuthGuard,
    CsrfGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    CsrfGuard,
    PermissionsGuard,
    sessionRepositoryProvider,
  ],
})
export class AuthModule {}
