import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';
import { UserRole } from '../../domain/models';
import { UserSchemaClass, type UserDocument } from './user.schema';
import type { IUserRepository } from '../interfaces/user.repository.interface';
import { escapeRegex } from '../../common/utils/regex-escape.util';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private toDomain(doc: UserDocument): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      passwordHash: (doc as any).passwordHash,
      bio: doc.bio,
      avatarUrl: doc.avatarUrl,
      preferredTopics: (doc as any).preferredTopics || [],
      role: doc.role,
      isActive: doc.isActive,
      isEmailVerified: (doc as any).isEmailVerified ?? false,
      emailVerificationToken: (doc as any).emailVerificationToken,
      emailVerificationExpiresAt: (doc as any).emailVerificationExpiresAt,
      acceptedTermsVersion: (doc as any).acceptedTermsVersion,
      acceptedTermsAt: (doc as any).acceptedTermsAt,
      notificationPreferences: (doc as any).notificationPreferences || undefined,
      passwordResetToken: (doc as any).passwordResetToken,
      passwordResetExpiresAt: (doc as any).passwordResetExpiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.userModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .select('+passwordHash')
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { deletedAt: null };

    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      const safe = escapeRegex(filters.search);
      query.$or = [
        { email: { $regex: safe, $options: 'i' } },
        { name: { $regex: safe, $options: 'i' } },
      ];
    }

    const [docs, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateUserDto): Promise<User> {
    const payload: any = {
      ...data,
      email: data.email.toLowerCase(),
      preferredTopics: data.preferredTopics ?? [],
      role: data.role ?? UserRole.USER,
      isActive: data.isActive ?? true,
      isEmailVerified: data.isEmailVerified ?? false,
      acceptedTermsVersion: data.acceptedTermsVersion ?? null,
      acceptedTermsAt: data.acceptedTermsAt ?? null,
      notificationPreferences: data.notificationPreferences ?? null,
    };
    if (data.id) {
      payload._id = data.id;
    }

    try {
      const doc = await this.userModel.create(payload);
      return this.toDomain(doc);
    } catch (err: any) {
      if (err?.code === 11000) {
        // Duplicate key, update existing record with new password hash & role
        const existing = await this.userModel.findOneAndUpdate(
          { email: data.email.toLowerCase() },
          {
            $set: {
              passwordHash: data.passwordHash,
              role: data.role ?? UserRole.USER,
              isActive: data.isActive ?? true,
              isEmailVerified: data.isEmailVerified ?? false,
            },
          },
          { new: true },
        ).exec();
        if (existing) return this.toDomain(existing);
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const update = {
      ...data,
      email: data.email ? data.email.toLowerCase() : undefined,
    };
    const doc = await this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: update },
        { new: true },
      )
      .exec();
    if (!doc) throw new Error('User not found');
    return this.toDomain(doc);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        { _id: id, deletedAt: null },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId, deletedAt: null },
        { $set: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt, updatedAt: new Date() } },
      )
      .exec();
  }

  async findByPasswordResetToken(tokenHash: string): Promise<User | null> {
    const doc = await this.userModel
      .findOne({
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
        deletedAt: null,
      })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByEmailVerificationToken(tokenHash: string): Promise<User | null> {
    const doc = await this.userModel
      .findOne({
        emailVerificationToken: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
        deletedAt: null,
      })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $set: { passwordResetToken: null, passwordResetExpiresAt: null, updatedAt: new Date() } },
      )
      .exec();
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId, deletedAt: null },
        { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } },
      )
      .exec();
  }
}
