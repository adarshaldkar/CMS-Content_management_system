import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmbedsService } from './embeds.service';
import { ScrapeEmbedDto, EmbedMetadataResponseDto } from './dto/embeds.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('embeds')
export class EmbedsController {
  constructor(private readonly embedsService: EmbedsService) {}

  @Post('scrape')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async scrape(@Body() dto: ScrapeEmbedDto): Promise<EmbedMetadataResponseDto> {
    return await this.embedsService.scrapeUrl(dto.url);
  }

  @Post('transcript')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async transcript(
    @Body() dto: ScrapeEmbedDto,
  ): Promise<{ transcript: string; transcriptLines: any[]; hasTranscript: boolean; provider: string; title: string }> {
    return await this.embedsService.fetchTranscript(dto.url);
  }
}

