import { validateImageBuffer } from './image-validator.util';

describe('ImageValidatorUtil (Magic Number File Signature Verification)', () => {
  it('should identify valid PNG signature', () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);

    const result = validateImageBuffer(pngHeader);
    expect(result.isValid).toBe(true);
    expect(result.detectedMime).toBe('image/png');
  });

  it('should identify valid JPEG signature', () => {
    const jpegHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60,
    ]);

    const result = validateImageBuffer(jpegHeader);
    expect(result.isValid).toBe(true);
    expect(result.detectedMime).toBe('image/jpeg');
  });

  it('should identify valid WebP signature', () => {
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20,
    ]);

    const result = validateImageBuffer(webpHeader);
    expect(result.isValid).toBe(true);
    expect(result.detectedMime).toBe('image/webp');
  });

  it('should reject malicious executable disguised as an image', () => {
    // Windows PE / EXE header "MZ"
    const fakeExe = Buffer.from([
      0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
      0xff, 0xff, 0x00, 0x00,
    ]);

    const result = validateImageBuffer(fakeExe);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid image signature');
  });

  it('should reject SVG files with active XML content', () => {
    const svgBuffer = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    const result = validateImageBuffer(svgBuffer);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('SVG and vector formats with active content are forbidden');
  });
});
