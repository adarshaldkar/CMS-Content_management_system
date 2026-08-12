import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ArticleRevision, CreateRevisionDto } from '../../domain/models';
import type { IRevisionRepository } from '../interfaces/revision.repository.interface';
import {
  RevisionDocument,
  RevisionSchemaClass,
} from './revision.schema';

@Injectable()
export class MongoRevisionRepository implements IRevisionRepository {
  constructor(
    @InjectModel(RevisionSchemaClass.name)
    private readonly revisionModel: Model<RevisionDocument>,
  ) {}

  private toDomain(doc: RevisionDocument): ArticleRevision {
    return {
      id: doc._id.toString(),
      articleId: doc.articleId,
      version: doc.version,
      title: doc.title,
      description: doc.description,
      content: doc.content,
      authorId: doc.authorId,
      changeSummary: doc.changeSummary ?? null,
      createdAt: doc.createdAt,
    };
  }

  async create(data: CreateRevisionDto): Promise<ArticleRevision> {
    const created = await this.revisionModel.create({
      articleId: data.articleId,
      version: data.version,
      title: data.title,
      description: data.description,
      content: data.content,
      authorId: data.authorId,
      changeSummary: data.changeSummary ?? null,
    });
    return this.toDomain(created);
  }

  async findByArticleId(articleId: string): Promise<ArticleRevision[]> {
    const docs = await this.revisionModel
      .find({ articleId })
      .sort({ version: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findById(id: string): Promise<ArticleRevision | null> {
    const doc = await this.revisionModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }
}
