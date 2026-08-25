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
        limit: 300,
      },
      {
        name: 'auth-sensitive',
        ttl: 60000,
        limit: 10, // Brute-force protection for login/register/forgot-password
      },
      {
        name: 'auth-relaxed',
        ttl: 60000,
        limit: 60, // Token refresh, logout
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
