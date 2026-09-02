import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import {
  SubscribeDto,
  UpdateSubscriberPreferencesDto,
  CreateCampaignDto,
  NewsletterWebhookDto,
  type SubscriberQueryFilters,
  SubscriberStatus,
  Permission,
} from '../../domain/models';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/security.decorators';

@Controller()
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  // ── Public Subscriber Endpoints ─────────────────────────────────────

  @Post('newsletter/subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(@Body() dto: SubscribeDto) {
    return await this.newsletterService.subscribe(dto);
  }

  @Get('newsletter/verify/:token')
  async verify(@Param('token') token: string) {
    return await this.newsletterService.verify(token);
  }

  @Get('newsletter/preferences/:token')
  async getPreferences(@Param('token') token: string) {
    return await this.newsletterService.getPreferencesByToken(token);
  }

  @Patch('newsletter/preferences/:token')
  async updatePreferences(
    @Param('token') token: string,
    @Body() dto: UpdateSubscriberPreferencesDto,
  ) {
    return await this.newsletterService.updatePreferencesByToken(token, dto);
  }

  @Post('newsletter/webhook/events')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: NewsletterWebhookDto) {
    return await this.newsletterService.handleWebhookEvent(body);
  }

  // ── Admin & Editorial Campaign Endpoints ────────────────────────────

  @Get('admin/newsletter/stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.NEWSLETTER_MANAGE)
  async getStats() {
    return await this.newsletterService.getStats();
  }

  @Get('admin/newsletter/subscribers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.NEWSLETTER_MANAGE)
  async getSubscribers(
    @Query('status') status?: SubscriberStatus,
    @Query('search') search?: string,
    @Query('topic') topic?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: SubscriberQueryFilters = {
      status,
      search,
      topic,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return await this.newsletterService.getSubscribers(filters);
  }

  @Get('admin/newsletter/campaigns')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.NEWSLETTER_MANAGE)
  async getCampaigns(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return await this.newsletterService.getCampaigns(
      limit ? parseInt(limit, 10) : 20,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Post('admin/newsletter/campaigns')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.NEWSLETTER_BROADCAST)
  async createCampaign(@Body() dto: CreateCampaignDto, @Req() req: any) {
    const authorId = req.user?.id || 'admin';
    return await this.newsletterService.createCampaign(dto, authorId);
  }

  @Post('admin/newsletter/campaigns/:id/send')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.NEWSLETTER_BROADCAST)
  async sendCampaign(@Param('id') id: string) {
    return await this.newsletterService.sendCampaign(id);
  }
}
