/**
 * Gazette Intermediate Representation (IR) Document Model
 * 
 * Defines the canonical normalized document structure between any input source
 * (PDF, Word DOCX, Google Docs, Markdown, Gutenberg) and TipTap/Gazette nodes.
 * 
 * Principle: "No Silent Content Loss" — Preserve difficult content, flag uncertainty, and structure data cleanly.
 */

export type GazetteBlockType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'figure'
  | 'table'
  | 'quote'
  | 'pullQuote'
  | 'callout'
  | 'footnote'
  | 'sourceNote'
  | 'equation'
  | 'divider'
  | 'unsupported';

export interface BaseGazetteBlock {
  id: string;
  type: GazetteBlockType;
  pageNumber?: number;
  confidence: number; // 0.0 to 1.0
  requiresReview?: boolean;
  reviewReason?: string;
}

export interface ParagraphBlock extends BaseGazetteBlock {
  type: 'paragraph';
  text: string;
  isDropCap?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface HeadingBlock extends BaseGazetteBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface ImageBlock extends BaseGazetteBlock {
  type: 'image';
  url: string;
  sha256Hash: string;
  originalName: string;
  mimeType: string;
  width?: number;
  height?: number;
  altText?: string;
  caption?: string;
  credit?: string;
  isVectorOrChart?: boolean;
}

export interface FigureBlock extends BaseGazetteBlock {
  type: 'figure';
  imageUrl?: string;
  svgContent?: string;
  caption?: string;
  sourceAttribution?: string;
}

export interface TableCell {
  content: string;
  isHeader?: boolean;
  colSpan?: number;
  rowSpan?: number;
}

export interface TableBlock extends BaseGazetteBlock {
  type: 'table';
  headers: string[];
  rows: TableCell[][];
  hasMergedCells?: boolean;
  caption?: string;
}

export interface QuoteBlock extends BaseGazetteBlock {
  type: 'quote';
  text: string;
  cite?: string;
}

export interface PullQuoteBlock extends BaseGazetteBlock {
  type: 'pullQuote';
  text: string;
  author?: string;
  publication?: string;
}

export interface CalloutBlock extends BaseGazetteBlock {
  type: 'callout';
  theme: 'info' | 'tip' | 'warning' | 'editorial';
  title: string;
  body: string;
}

export interface FootnoteBlock extends BaseGazetteBlock {
  type: 'footnote';
  index: number;
  text: string;
  identifier?: string;
}

export interface SourceNoteBlock extends BaseGazetteBlock {
  type: 'sourceNote';
  sources: string[];
}

export interface EquationBlock extends BaseGazetteBlock {
  type: 'equation';
  rawTex?: string;
  mathMl?: string;
  fallbackImageUrl?: string;
  isEditable: boolean;
}

export interface DividerBlock extends BaseGazetteBlock {
  type: 'divider';
  style: 'asterism' | 'ornament' | 'line';
}

export interface UnsupportedBlock extends BaseGazetteBlock {
  type: 'unsupported';
  originalType: string;
  rawContent: string;
}

export type GazetteBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | FigureBlock
  | TableBlock
  | QuoteBlock
  | PullQuoteBlock
  | CalloutBlock
  | FootnoteBlock
  | SourceNoteBlock
  | EquationBlock
  | DividerBlock
  | UnsupportedBlock;

export interface ExtractedLink {
  id: string;
  pageNumber: number;
  visibleText: string;
  url: string;
  isExternal: boolean;
  isMalformed?: boolean;
  needsReview?: boolean;
}

export interface GazetteDocumentPageIR {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  isScanned: boolean;
  blocks: GazetteBlock[];
  wordCount: number;
}

export interface GazetteDocumentIR {
  version: '1.0';
  sourceFormat: 'pdf' | 'docx' | 'gutenberg' | 'md' | 'txt';
  filename: string;
  fileSizeBytes: number;
  sha256: string;
  totalPages: number;
  totalWords: number;
  detectedTitle?: string;
  detectedAuthor?: string;
  creationDate?: string;
  pages: GazetteDocumentPageIR[];
  links: ExtractedLink[];
  summary: {
    totalBlocks: number;
    textBlocksCount: number;
    imagesCount: number;
    uniqueImagesCount: number;
    duplicateImagesRemoved: number;
    tablesCount: number;
    linksCount: number;
    figuresCount: number;
    equationsCount: number;
    footnotesCount: number;
    scannedPagesCount: number;
    requiresReviewCount: number;
  };
}
