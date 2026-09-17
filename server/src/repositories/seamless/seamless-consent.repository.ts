import { Logger } from '@nestjs/common';
import type { ConsentRecord, CreateConsentRecordDto } from '../../domain/models';
import type { IConsentRepository } from '../interfaces/consent.repository.interface';
import type { SupportedDbName, IRuntimeSwitchableRepository } from '../repository-proxy';
import { activeEngine, selectActiveReadRepo } from './db-router.util';

export class SeamlessConsentRepository implements IConsentRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessConsentRepository.name);

  constructor(
    private readonly postgresRepo: IConsentRepository,
    private readonly mongoRepo: IConsentRepository,
  ) {}

  __switchActive(target: SupportedDbName): void {
    process.env.ACTIVE_DATABASE = target;
  }

  __activeDb(): SupportedDbName {
    return activeEngine();
  }

  private get activeRepo(): IConsentRepository {
    return activeEngine() === 'mongodb' ? this.mongoRepo : this.postgresRepo;
  }

  private get peerRepo(): IConsentRepository {
    return activeEngine() === 'mongodb' ? this.postgresRepo : this.mongoRepo;
  }

  async create(data: CreateConsentRecordDto): Promise<ConsentRecord> {
    const record = await this.activeRepo.create(data);
    this.peerRepo.create(data).catch(() => {});
    return record;
  }

  async findUserConsent(userId: string): Promise<ConsentRecord[]> {
    return this.activeRepo.findUserConsent(userId);
  }
}
