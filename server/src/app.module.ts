import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
import { RedisModule } from './redis/redis.module';
import { BullQueueModule } from './bull/bull-queue.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { MediaModule } from './modules/media/media.module';
import { CommentsModule } from './modules/comments/comments.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { LikesModule } from './modules/likes/likes.module';
import { FollowsModule } from './modules/follows/follows.module';
import { PublishingSlotsModule } from './modules/publishing-slots/publishing-slots.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    AppConfigModule,
    RedisModule,
    BullQueueModule,
    DatabaseModule,
    HealthModule,
    AuditModule,
    AuthModule,
    ArticlesModule,
    UsersModule,
    CategoriesModule,
    MediaModule,
    CommentsModule,
    BookmarksModule,
    LikesModule,
    FollowsModule,
    PublishingSlotsModule,
    NotificationsModule,
    JobsModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 1000, // Standard API reading and browsing operations
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
