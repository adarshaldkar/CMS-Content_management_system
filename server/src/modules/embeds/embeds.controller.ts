import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmbedsService } from './embeds.service';
import { ScrapeEmbedDto, EmbedMetadataResponseDto } from './dto/embeds.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('embeds')
export class EmbedsController {
  constructor(private readonly embedsService: EmbedsService) {}

  @Post('scrape')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async scrape(@Body() dto: ScrapeEmbedDto): Promise<EmbedMetadataResponseDto> {
    return await this.embedsService.scrapeUrl(dto.url);
  }
}
