import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublishingSlotsModule } from '../publishing-slots/publishing-slots.module';
import {
  ArticleSchema,
  ArticleSchemaClass,
} from '../../repositories/mongo/article.schema';
import {
  RevisionSchema,
  RevisionSchemaClass,
} from '../../repositories/mongo/revision.schema';
import {
  CategorySchema,
  CategorySchemaClass,
} from '../../repositories/mongo/category.schema';
import { PostgresArticleRepository } from '../../repositories/postgres/postgres-article.repository';
import { MongoArticleRepository } from '../../repositories/mongo/mongo-article.repository';
import { PostgresRevisionRepository } from '../../repositories/postgres/postgres-revision.repository';
import { MongoRevisionRepository } from '../../repositories/mongo/mongo-revision.repository';
import {
  articleRepositoryProvider,
  revisionRepositoryProvider,
} from '../../repositories/repository.providers';
import { ArticlesController } from './articles.controller';
import { ArticleService } from './article.service';
import { WorkflowService } from './workflow.service';
import { PublisherWorker } from './publisher.worker';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => PublishingSlotsModule),
    MongooseModule.forFeature([
      { name: ArticleSchemaClass.name, schema: ArticleSchema },
      { name: RevisionSchemaClass.name, schema: RevisionSchema },
      { name: CategorySchemaClass.name, schema: CategorySchema },
    ]),
  ],
  controllers: [ArticlesController],
  providers: [
    ArticleService,
    WorkflowService,
    PublisherWorker,
    PostgresService,
    PostgresArticleRepository,
    MongoArticleRepository,
    articleRepositoryProvider,
    PostgresRevisionRepository,
    MongoRevisionRepository,
    revisionRepositoryProvider,
  ],
  exports: [ArticleService, WorkflowService, articleRepositoryProvider, revisionRepositoryProvider],
})
export class ArticlesModule {}
