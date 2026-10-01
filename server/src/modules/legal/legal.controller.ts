import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { EnvConfig } from '../../config/env.schema';
import { LegalService } from './legal.service';
import type { PolicyDocument } from './legal.service';
import { Public, CurrentUser } from '../../common/decorators/security.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser, ConsentRecord, JwtAccessPayload } from '../../domain/models';
import { RecordConsentDtoClass, FileCopyrightClaimDtoClass } from './dto/legal.dto';

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(
    private readonly legalService: LegalService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  private extractUserId(req: Request): string | null {
    const cookies = req.cookies || {};
    const authHeader = req.headers['authorization'] || (req.headers as any)['Authorization'];
    const bearerToken =
      authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const token = cookies['__Host-access'] || cookies['access_token'] || bearerToken;
    if (!token) return null;

    try {
      const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'cms-platform',
        audience: 'cms-client',
      }) as JwtAccessPayload;
      return decoded.sub || null;
    } catch {
      return null;
    }
  }

  @Public()
  @Get('policies/:type')
  @ApiOperation({ summary: 'Get policy document (terms, privacy, cookie, accessibility, community-guidelines, subprocessors)' })
  getPolicy(@Param('type') type: string): PolicyDocument {
    return this.legalService.getPolicy(type);
  }

  @Public()
  @Post('consent')
  @ApiOperation({ summary: 'Record user or visitor cookie/privacy consent decision' })
  async recordConsent(
    @Body() body: RecordConsentDtoClass,
    @Req() req: Request,
    @CurrentUser() user?: AuthUser,
  ): Promise<ConsentRecord> {
    const userId = user?.id || this.extractUserId(req);
    return this.legalService.recordConsent(
      {
        userId: userId || null,
        consentType: body.consentType,
        choice: body.choice,
        version: body.version || 'v1.0',
      },
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('consent')
  @ApiOperation({ summary: 'Get consent history for authenticated user' })
  async getUserConsent(@CurrentUser() user: AuthUser): Promise<ConsentRecord[]> {
    return this.legalService.getUserConsent(user.id);
  }

  @Public()
  @Post('copyright-claim')
  @ApiOperation({ summary: 'Submit a Copyright/DMCA infringement claim' })
  async fileCopyrightClaim(
    @Body() body: FileCopyrightClaimDtoClass,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.legalService.fileCopyrightClaim(body, user);
  }
}

