import { BadRequestException } from '@nestjs/common';
import {
  validateVideoMagicBytes,
  parseRangeHeader,
} from './utils/video-validator.util';

describe('Video Streaming Engine & Magic Bytes Validator', () => {
  describe('Magic Bytes Gatekeeper (validateVideoMagicBytes)', () => {
    it('should identify valid MP4 header signatures', () => {
      // Create fake MP4 buffer: 4 bytes length + 'ftyp' + 'isom'
      const buf = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      const res = validateVideoMagicBytes(buf);
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('mp4');
    });

    it('should identify valid WebM header signatures (EBML)', () => {
      // WebM EBML magic: 1A 45 DF A3
      const buf = Buffer.from([
        0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      const res = validateVideoMagicBytes(buf);
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('webm');
    });

    it('should identify valid QuickTime MOV header signatures', () => {
      // Fake MOV buffer with 'ftypqt'
      const buf = Buffer.from([
        0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
      ]);
      const res = validateVideoMagicBytes(buf);
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('mov');
    });

    it('should reject non-video files disguised with video extensions', () => {
      // Plain text header
      const textBuf = Buffer.from('Hello world! This is a plain text file pretending to be video.');
      const res = validateVideoMagicBytes(textBuf);
      expect(res.isValid).toBe(false);
    });

    it('should reject short or empty buffers', () => {
      const shortBuf = Buffer.from([0x00, 0x01, 0x02]);
      const res = validateVideoMagicBytes(shortBuf);
      expect(res.isValid).toBe(false);
    });
  });

  describe('HTTP Range Header Parser (parseRangeHeader)', () => {
    const fileSize = 10 * 1024 * 1024; // 10 MB file (10485760 bytes)

    it('should parse standard byte range requests (bytes=0-1023)', () => {
      const res = parseRangeHeader('bytes=0-1023', fileSize);
      expect(res).not.toBeNull();
      expect(res?.start).toBe(0);
      expect(res?.end).toBe(1023);
      expect(res?.chunkSize).toBe(1024);
      expect(res?.fileSize).toBe(fileSize);
    });

    it('should handle open-ended range requests (bytes=1048576-)', () => {
      const res = parseRangeHeader('bytes=1048576-', fileSize);
      expect(res).not.toBeNull();
      expect(res?.start).toBe(1048576);
      expect(res?.end).toBe(fileSize - 1);
      expect(res?.chunkSize).toBe(fileSize - 1048576);
    });

    it('should handle tail range requests (bytes=-500)', () => {
      const res = parseRangeHeader('bytes=-500', fileSize);
      expect(res).not.toBeNull();
      expect(res?.start).toBe(fileSize - 500);
      expect(res?.end).toBe(fileSize - 1);
      expect(res?.chunkSize).toBe(500);
    });

    it('should throw BadRequestException for out of bounds range requests', () => {
      expect(() => parseRangeHeader('bytes=20000000-30000000', fileSize)).toThrow(
        BadRequestException,
      );
    });

    it('should return null when range header is missing or malformed', () => {
      expect(parseRangeHeader(undefined, fileSize)).toBeNull();
      expect(parseRangeHeader('invalid-header', fileSize)).toBeNull();
    });
  });
});
