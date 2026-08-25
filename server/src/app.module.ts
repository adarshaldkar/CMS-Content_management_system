import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
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


@Module({
  imports: [
    AppConfigModule,
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
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 300, // Standard API reading operations
      },
      {
        name: 'auth-sensitive',
        ttl: 60000,
        limit: 10, // Login, registration, password reset
      },
      {
        name: 'auth-relaxed',
        ttl: 60000,
        limit: 60, // Refresh tokens
      },
      {
        name: 'admin-critical',
        ttl: 60000,
        limit: 10, // Database switching, role changes, account bans
      },
      {
        name: 'admin-standard',
        ttl: 60000,
        limit: 60, // Admin review and user directory listing
      },
      {
        name: 'user-mutation',
        ttl: 60000,
        limit: 30, // Comments, likes, bookmarks anti-spam
      },
      {
        name: 'media-upload',
        ttl: 60000,
        limit: 15, // Media file uploads anti-DoS
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
