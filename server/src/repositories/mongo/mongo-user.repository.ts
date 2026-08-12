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
      query.$or = [
        { email: { $regex: filters.search, $options: 'i' } },
        { name: { $regex: filters.search, $options: 'i' } },
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
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async create(data: CreateUserDto): Promise<User> {
    const doc = await this.userModel.create({
      ...data,
      email: data.email.toLowerCase(),
      preferredTopics: data.preferredTopics ?? [],
      role: data.role ?? UserRole.USER,
      isActive: data.isActive ?? true,
    });
    return this.toDomain(doc);
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
}
