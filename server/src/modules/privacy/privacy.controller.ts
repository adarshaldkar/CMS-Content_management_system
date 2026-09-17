import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrivacyService, GdprExportBundle } from './privacy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser } from '../../common/decorators/security.decorators';
import { clearAuthCookies } from '../../common/utils/cookie.util';
import type { AuthUser } from '../../domain/models';

@ApiTags('privacy')
@Controller('privacy')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GDPR Data Export — Download personal data bundle in JSON format' })
  async exportData(@CurrentUser() user: AuthUser): Promise<GdprExportBundle> {
    return this.privacyService.exportUserData(user);
  }

  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user account and revoke all sessions' })
  async deactivateAccount(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.privacyService.deactivateAccount(user.id);
    clearAuthCookies(res, false, false);
    return result;
  }

  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanent Account Erasure & Anonymization (Right to be Forgotten)' })
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.privacyService.deleteAccount(user.id);
    clearAuthCookies(res, false, false);
    return result;
  }
}
