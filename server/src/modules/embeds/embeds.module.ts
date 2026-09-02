import { Module } from '@nestjs/common';
import { EmbedsService } from './embeds.service';
import { EmbedsController } from './embeds.controller';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [EmbedsController],
  providers: [EmbedsService],
  exports: [EmbedsService],
})
export class EmbedsModule {}
