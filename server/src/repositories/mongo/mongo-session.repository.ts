import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CreateSessionDto, RefreshTokenSession } from '../../domain/models';
import type {
  ISessionRepository,
  RotationResult,
} from '../interfaces/session.repository.interface';
import {
  SessionDocument,
  SessionSchemaClass,
} from './session.schema';

@Injectable()
export class MongoSessionRepository implements ISessionRepository {
  constructor(
    @InjectModel(SessionSchemaClass.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  private toDomain(doc: SessionDocument): RefreshTokenSession {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      familyId: doc.familyId,
      tokenHash: doc.tokenHash,
      isRevoked: doc.isRevoked,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      userAgent: doc.userAgent,
      ipAddress: doc.ipAddress,
    };
  }

  async create(data: CreateSessionDto): Promise<RefreshTokenSession> {
    const payload: any = {
      userId: data.userId,
      familyId: data.familyId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      userAgent: data.userAgent ?? null,
      ipAddress: data.ipAddress ?? null,
    };
    if (data.id) {
      payload._id = data.id;
    }
    const created = await this.sessionModel.create(payload);
    return this.toDomain(created);
  }

  async findById(id: string): Promise<RefreshTokenSession | null> {
    const doc = await this.sessionModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async rotateAtomic(
    oldSessionId: string,
    tokenHash: string,
    newSessionData: CreateSessionDto,
  ): Promise<RotationResult> {
    // Atomic compare-and-swap: mark revoked only if currently NOT revoked and tokenHash matches
    const oldSession = await this.sessionModel
      .findOneAndUpdate(
        { _id: oldSessionId, isRevoked: false, tokenHash },
        { $set: { isRevoked: true } },
        { new: false },
      )
      .exec();

    if (!oldSession) {
      // Either session not found, or it was ALREADY revoked -> Check for reuse
      const existing = await this.sessionModel.findById(oldSessionId).exec();
      if (existing) {
        // Reuse detected! Invalidate entire family
        await this.sessionModel
          .updateMany(
            { familyId: existing.familyId },
            { $set: { isRevoked: true } },
          )
          .exec();
        return {
          success: false,
          reuseDetected: true,
          familyId: existing.familyId,
        };
      }
      return { success: false };
    }

    // Successfully revoked old session atomically, create new session in same family
    const newSessionPayload: any = {
      userId: newSessionData.userId,
      familyId: oldSession.familyId,
      tokenHash: newSessionData.tokenHash,
      expiresAt: newSessionData.expiresAt,
      userAgent: newSessionData.userAgent ?? null,
      ipAddress: newSessionData.ipAddress ?? null,
    };
    if (newSessionData.id) {
      newSessionPayload._id = newSessionData.id;
    }
    const created = await this.sessionModel.create(newSessionPayload);

    return {
      success: true,
      session: this.toDomain(created),
      familyId: oldSession.familyId,
    };
  }

  async revokeFamily(familyId: string): Promise<number> {
    const result = await this.sessionModel
      .updateMany({ familyId, isRevoked: false }, { $set: { isRevoked: true } })
      .exec();
    return result.modifiedCount;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.sessionModel
      .updateMany({ userId, isRevoked: false }, { $set: { isRevoked: true } })
      .exec();
    return result.modifiedCount;
  }
}
