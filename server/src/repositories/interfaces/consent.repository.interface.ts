import type { ConsentRecord, CreateConsentRecordDto } from '../../domain/models';

export const CONSENT_REPOSITORY = Symbol('CONSENT_REPOSITORY');

export interface IConsentRepository {
  create(data: CreateConsentRecordDto): Promise<ConsentRecord>;
  findUserConsent(userId: string): Promise<ConsentRecord[]>;
}
