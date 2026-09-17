export type ConsentType =
  | 'COOKIE_ESSENTIAL'
  | 'COOKIE_ANALYTICS'
  | 'COOKIE_FUNCTIONAL'
  | 'COOKIE_MARKETING'
  | 'TERMS_ACCEPTANCE'
  | 'PRIVACY_POLICY'
  | 'NEWSLETTER_SUBSCRIPTION';

export type ConsentChoice = 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface ConsentRecord {
  id: string;
  userId?: string | null;
  consentType: ConsentType;
  version: string;
  choice: ConsentChoice;
  timestamp: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateConsentRecordDto {
  userId?: string | null;
  consentType: ConsentType;
  version: string;
  choice: ConsentChoice;
  ipAddress?: string | null;
  userAgent?: string | null;
}
