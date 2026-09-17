import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import { ConsentSchemaClass, ConsentSchema } from '../../repositories/mongo/consent.schema';
import { PostgresConsentRepository } from '../../repositories/postgres/postgres-consent.repository';
import { MongoConsentRepository } from '../../repositories/mongo/mongo-consent.repository';
import { SeamlessConsentRepository } from '../../repositories/seamless/seamless-consent.repository';
import { CONSENT_REPOSITORY } from '../../repositories/interfaces/consent.repository.interface';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: ConsentSchemaClass.name, schema: ConsentSchema },
    ]),
  ],
  controllers: [LegalController],
  providers: [
    LegalService,
    PostgresService,
    PostgresConsentRepository,
    MongoConsentRepository,
    {
      provide: CONSENT_REPOSITORY,
      useFactory: (postgresRepo: PostgresConsentRepository, mongoRepo: MongoConsentRepository) => {
        return new SeamlessConsentRepository(postgresRepo, mongoRepo);
      },
      inject: [PostgresConsentRepository, MongoConsentRepository],
    },
  ],
  exports: [LegalService, CONSENT_REPOSITORY],
})
export class LegalModule {}
