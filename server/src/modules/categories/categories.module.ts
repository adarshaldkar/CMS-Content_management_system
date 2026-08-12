import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CategorySchema,
  CategorySchemaClass,
} from '../../repositories/mongo/category.schema';
import { MongoCategoryRepository } from '../../repositories/mongo/mongo-category.repository';
import { PostgresCategoryRepository } from '../../repositories/postgres/postgres-category.repository';
import { categoryRepositoryProvider } from '../../repositories/repository.providers';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategorySchemaClass.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [
    PostgresCategoryRepository,
    MongoCategoryRepository,
    categoryRepositoryProvider,
    CategoriesService,
  ],
  exports: [categoryRepositoryProvider, CategoriesService],
})
export class CategoriesModule {}
