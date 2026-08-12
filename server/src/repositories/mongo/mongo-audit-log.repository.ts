import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuditEventType, AuditLog, CreateAuditLogDto } from '../../domain/models';
import type { IAuditLogRepository } from '../interfaces/audit-log.repository.interface';
import {
  AuditLogDocument,
  AuditLogSchemaClass,
} from './audit-log.schema';

@Injectable()
export class MongoAuditLogRepository implements IAuditLogRepository {
  constructor(
    @InjectModel(AuditLogSchemaClass.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  private toDomain(doc: AuditLogDocument): AuditLog {
    return {
      id: doc._id.toString(),
      actorId: doc.actorId,
      action: doc.action,
      resource: doc.resource,
      result: doc.result,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      referenceId: doc.referenceId,
      metadata: doc.metadata ?? null,
      createdAt: doc.createdAt,
    };
  }

  async create(data: CreateAuditLogDto): Promise<AuditLog> {
    const created = await this.auditModel.create({
      actorId: data.actorId ?? null,
      action: data.action,
      resource: data.resource,
      result: data.result,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      referenceId: data.referenceId ?? null,
      metadata: data.metadata ?? null,
    });
    return this.toDomain(created);
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    const docs = await this.auditModel
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 500))
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }
}
