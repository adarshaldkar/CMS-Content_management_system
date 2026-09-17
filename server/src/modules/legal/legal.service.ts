import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CONSENT_REPOSITORY,
  type IConsentRepository,
} from '../../repositories/interfaces/consent.repository.interface';
import {
  AuditEventType,
  type AuthUser,
  type ConsentRecord,
  type CreateConsentRecordDto,
} from '../../domain/models';
import { AuditService } from '../audit/audit.service';

export interface PolicyDocument {
  type: string;
  title: string;
  version: string;
  lastUpdated: string;
  content: string;
}

@Injectable()
export class LegalService {
  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly consentRepo: IConsentRepository,
    private readonly auditService: AuditService,
  ) {}

  getPolicy(type: string): PolicyDocument {
    const policies: Record<string, PolicyDocument> = {
      terms: {
        type: 'terms',
        title: 'Terms of Service',
        version: 'v1.0',
        lastUpdated: '2026-09-18',
        content: `# Terms of Service

Welcome to **The Gazette**. By accessing or using our publication platform, you agree to be bound by these Terms of Service.

## 1. Acceptable Use
Users agree not to upload malicious scripts, engage in harassment, post copyright-infringing content, or disrupt platform infrastructure.

## 2. Editorial Rights
The Gazette reserves the right to moderate, hide, or remove content violating community guidelines.

## 3. Account Security
Users are responsible for safeguarding credentials and session tokens.`,
      },
      privacy: {
        type: 'privacy',
        title: 'Privacy Policy',
        version: 'v1.0',
        lastUpdated: '2026-09-18',
        content: `# Privacy Policy

The Gazette is committed to protecting personal data under the DPDP Act 2023 and GDPR.

## 1. Data Collected
We collect account information (email, name), session identifiers, and optional preferences.

## 2. Cookie Controls
You have full right to Accept All, Reject Optional, or Granularly manage cookie preferences at any time.

## 3. Data Rights
You may export your complete data bundle or request account erasure at any time via Settings.`,
      },
      cookie: {
        type: 'cookie',
        title: 'Cookie Policy',
        version: 'v1.0',
        lastUpdated: '2026-09-18',
        content: `# Cookie Policy

We categorize cookies into:
- **Essential**: System operations, CSRF protection, session integrity (Always Active).
- **Analytics**: Performance measurement and traffic breakdown.
- **Functional**: Custom reader settings and layout choices.
- **Marketing**: Relevant publication announcements.`,
      },
      accessibility: {
        type: 'accessibility',
        title: 'Accessibility Statement',
        version: 'v1.0',
        lastUpdated: '2026-09-18',
        content: `# Accessibility Statement

The Gazette is committed to ensuring digital accessibility for people with disabilities adhering to **WCAG 2.2 Level AA** standards.

## Supported Environments
Supports screen readers, keyboard navigation, high contrast modes, and reduced motion settings.

## Reporting Issues
To report accessibility issues, contact \`accessibility@gazette.io\`.`,
      },
      'community-guidelines': {
        type: 'community-guidelines',
        title: 'Community Guidelines',
        version: 'v1.0',
        lastUpdated: '2026-09-18',
        content: `# Community Guidelines

1. Be respectful and constructive in comments.
2. No spam, self-promotion loops, or harassment.
3. Original attribution required for cited works.`,
      },
      subprocessors: {
        type: 'subprocessors',
        title: 'Third-Party Services & Subprocessors',
        version: 'v1.0',
        lastUpdated: '2026-09-18',
        content: `# Third-Party Services & Subprocessors

| Subprocessor | Purpose | Location |
|---|---|---|
| Cloudflare | WAF, Bot Protection (Turnstile), Edge CDN | Global |
| Resend | Transactional Email Delivery | USA / EU |
| Cloudinary / AWS S3 | Scalable Media Storage | Global |
| Google OAuth | Optional Social Authentication | Global |
| Sentry | Error Monitoring & Diagnostic Tracing | USA |`,
      },
    };

    const policy = policies[type.toLowerCase()];
    if (!policy) {
      throw new NotFoundException(`Policy document '${type}' not found.`);
    }

    return policy;
  }

  async recordConsent(
    data: CreateConsentRecordDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<ConsentRecord> {
    const record = await this.consentRepo.create({
      userId: data.userId ?? null,
      consentType: data.consentType,
      version: data.version || 'v1.0',
      choice: data.choice,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    if (data.userId) {
      await this.auditService.log({
        actorId: data.userId,
        action: AuditEventType.USER_UPDATED,
        resource: `Consent:${data.consentType}`,
        result: 'SUCCESS',
        metadata: { choice: data.choice, version: data.version },
      });
    }

    return record;
  }

  async getUserConsent(userId: string): Promise<ConsentRecord[]> {
    return this.consentRepo.findUserConsent(userId);
  }

  async fileCopyrightClaim(
    claim: {
      articleUrl: string;
      claimantName: string;
      claimantEmail: string;
      description: string;
      declaration: boolean;
    },
    user?: AuthUser,
  ): Promise<{ claimId: string; status: string; message: string }> {
    const claimId = `dmca-${Date.now()}`;

    await this.auditService.log({
      actorId: user?.id || 'anonymous',
      action: AuditEventType.SYSTEM_ALERT,
      resource: `DMCA:${claimId}`,
      result: 'SUCCESS',
      metadata: {
        articleUrl: claim.articleUrl,
        claimantEmail: claim.claimantEmail,
        claimantName: claim.claimantName,
      },
    });

    return {
      claimId,
      status: 'SUBMITTED',
      message: 'Copyright complaint received and logged to admin moderation queue.',
    };
  }
}
