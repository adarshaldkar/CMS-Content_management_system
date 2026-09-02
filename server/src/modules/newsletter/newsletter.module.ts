import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../database/database.module';
import { BullQueueModule } from '../../bull/bull-queue.module';
import { AuditModule } from '../audit/audit.module';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterBroadcastWorker } from './newsletter-broadcast.worker';
import { PostgresNewsletterRepository } from '../../repositories/postgres/postgres-newsletter.repository';
import { MongoNewsletterRepository } from '../../repositories/mongo/mongo-newsletter.repository';
import {
  NewsletterSubscriberMongo,
  NewsletterSubscriberSchema,
  NewsletterCampaignMongo,
  NewsletterCampaignSchema,
} from '../../repositories/mongo/newsletter.schema';
import {
  newsletterRepositoryProvider,
} from '../../repositories/repository.providers';
import { NEWSLETTER_REPOSITORY } from '../../repositories/interfaces/newsletter.repository.interface';

@Module({
  imports: [
    DatabaseModule,
    BullQueueModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: NewsletterSubscriberMongo.name, schema: NewsletterSubscriberSchema },
      { name: NewsletterCampaignMongo.name, schema: NewsletterCampaignSchema },
    ]),
  ],
  controllers: [NewsletterController],
  providers: [
    NewsletterService,
    NewsletterBroadcastWorker,
    PostgresNewsletterRepository,
    MongoNewsletterRepository,
    newsletterRepositoryProvider,
  ],
  exports: [NewsletterService, NEWSLETTER_REPOSITORY],
})
export class NewsletterModule {}
