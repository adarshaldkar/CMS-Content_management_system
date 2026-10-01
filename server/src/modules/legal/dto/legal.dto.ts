import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConsentChoice, ConsentType } from '../../../domain/models';

export const ALLOWED_CONSENT_TYPES: ConsentType[] = [
  'COOKIE_ESSENTIAL',
  'COOKIE_ANALYTICS',
  'COOKIE_FUNCTIONAL',
  'COOKIE_MARKETING',
  'TERMS_ACCEPTANCE',
  'PRIVACY_POLICY',
  'NEWSLETTER_SUBSCRIPTION',
];

export const ALLOWED_CONSENT_CHOICES: ConsentChoice[] = ['ACCEPTED', 'DECLINED', 'WITHDRAWN'];

export class RecordConsentDtoClass {
  @ApiProperty({
    enum: ALLOWED_CONSENT_TYPES,
    example: 'COOKIE_ANALYTICS',
  })
  @IsNotEmpty({ message: 'consentType is required.' })
  @IsIn(ALLOWED_CONSENT_TYPES, {
    message: `consentType must be one of: ${ALLOWED_CONSENT_TYPES.join(', ')}.`,
  })
  consentType!: ConsentType;

  @ApiProperty({
    enum: ALLOWED_CONSENT_CHOICES,
    example: 'ACCEPTED',
  })
  @IsNotEmpty({ message: 'choice is required.' })
  @IsIn(ALLOWED_CONSENT_CHOICES, {
    message: `choice must be one of: ${ALLOWED_CONSENT_CHOICES.join(', ')}.`,
  })
  choice!: ConsentChoice;

  @ApiPropertyOptional({ example: 'v1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;
}

export class FileCopyrightClaimDtoClass {
  @ApiProperty({ example: 'https://gazette.io/articles/sample-article' })
  @IsNotEmpty({ message: 'articleUrl is required.' })
  @IsString()
  @MaxLength(500)
  articleUrl!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty({ message: 'claimantName is required.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  claimantName!: string;

  @ApiProperty({ example: 'legal@rightsholder.org' })
  @IsNotEmpty({ message: 'claimantEmail is required.' })
  @IsEmail({}, { message: 'A valid claimantEmail address is required.' })
  @MaxLength(254)
  claimantEmail!: string;

  @ApiProperty({ example: 'The article copies full paragraphs from copyrighted work without license.' })
  @IsNotEmpty({ message: 'description is required.' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: true })
  @IsNotEmpty({ message: 'declaration statement is required.' })
  @IsBoolean({ message: 'declaration must be a boolean.' })
  declaration!: boolean;
}
