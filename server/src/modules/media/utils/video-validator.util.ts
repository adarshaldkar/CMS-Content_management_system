import { BadRequestException } from '@nestjs/common';

export interface RangeHeaderParsed {
  start: number;
  end: number;
  chunkSize: number;
  fileSize: number;
}

export type SupportedVideoFormat = 'mp4' | 'webm' | 'mov';

/**
 * Validates binary header signatures (magic bytes) for video containers.
 * - MP4: Bytes 4-7 match 'ftyp' (isom, mp42, MSNV, avc1, etc.)
 * - WebM: Bytes 0-3 match 0x1A45DFA3 (\x1A\x45\xDF\xA3 EBML header)
 * - QuickTime MOV: Bytes 4-7 match 'ftypqt' or top-level atom 'moov' / 'mdat'
 */
export function validateVideoMagicBytes(buffer: Buffer): { isValid: boolean; format?: SupportedVideoFormat } {
  if (!buffer || buffer.length < 12) {
    return { isValid: false };
  }

  // 1. WebM Check (EBML Header: 1A 45 DF A3)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { isValid: true, format: 'webm' };
  }

  // 2. MP4 & MOV Check (inspect 'ftyp' or container box at bytes 4-7)
  const boxType = buffer.toString('ascii', 4, 8);

  if (boxType === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (brand.includes('qt')) {
      return { isValid: true, format: 'mov' };
    }
    // MP4 Brands: isom, mp41, mp42, avc1, dash, M4V , etc.
    return { isValid: true, format: 'mp4' };
  }

  // MOV container alternative atom header checks (moov / mdat)
  if (boxType === 'moov' || boxType === 'mdat' || boxType === 'wide') {
    return { isValid: true, format: 'mov' };
  }

  return { isValid: false };
}

/**
 * Parses HTTP Range headers (e.g. 'bytes=1048576-2097151' or 'bytes=0-')
 * and calculates byte offsets and response chunk sizes.
 */
export function parseRangeHeader(rangeHeader: string | undefined, fileSize: number): RangeHeaderParsed | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const rangeStr = rangeHeader.replace(/^bytes=/, '').trim();
  const parts = rangeStr.split('-');
  const rawStart = parts[0] ? parseInt(parts[0], 10) : undefined;
  const rawEnd = parts[1] ? parseInt(parts[1], 10) : undefined;

  let start: number;
  let end: number;

  if (rawStart !== undefined && !isNaN(rawStart)) {
    start = rawStart;
    end = rawEnd !== undefined && !isNaN(rawEnd) ? rawEnd : fileSize - 1;
  } else if (rawEnd !== undefined && !isNaN(rawEnd)) {
    start = Math.max(0, fileSize - rawEnd);
    end = fileSize - 1;
  } else {
    return null;
  }

  // Enforce range bounds
  if (start < 0 || start >= fileSize || end < start) {
    throw new BadRequestException('Requested range is out of bounds for the media asset.');
  }

  // Clamp end to file ceiling
  end = Math.min(end, fileSize - 1);
  const chunkSize = end - start + 1;

  return {
    start,
    end,
    chunkSize,
    fileSize,
  };
}
