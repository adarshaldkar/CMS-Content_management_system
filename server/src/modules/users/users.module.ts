import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserSchema,
  UserSchemaClass,
} from '../../repositories/mongo/user.schema';
import { MongoUserRepository } from '../../repositories/mongo/mongo-user.repository';
import { PostgresUserRepository } from '../../repositories/postgres/postgres-user.repository';
import { userRepositoryProvider } from '../../repositories/repository.providers';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
    ]),
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [
    PostgresUserRepository,
    MongoUserRepository,
    userRepositoryProvider,
    UsersService,
  ],
  exports: [userRepositoryProvider, UsersService],
})
export class UsersModule {}
