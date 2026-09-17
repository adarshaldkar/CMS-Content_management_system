import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ConsentRecord, CreateConsentRecordDto } from '../../domain/models';
import type { IConsentRepository } from '../interfaces/consent.repository.interface';
import { ConsentDocument, ConsentSchemaClass } from './consent.schema';

@Injectable()
export class MongoConsentRepository implements IConsentRepository {
  constructor(
    @InjectModel(ConsentSchemaClass.name)
    private readonly consentModel: Model<ConsentDocument>,
  ) {}

  private toDomain(doc: any): ConsentRecord {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      consentType: doc.consentType,
      version: doc.version,
      choice: doc.choice,
      timestamp: doc.timestamp,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
    };
  }

  async create(data: CreateConsentRecordDto): Promise<ConsentRecord> {
    const created = await this.consentModel.create({
      userId: data.userId ?? null,
      consentType: data.consentType,
      version: data.version,
      choice: data.choice,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    });
    return this.toDomain(created);
  }

  async findUserConsent(userId: string): Promise<ConsentRecord[]> {
    const docs = await this.consentModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }
}
