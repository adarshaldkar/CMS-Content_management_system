# Gazette — Image Optimization & Adaptive Enhancement Specification

> **Subsystem:** Media Engine / Asset Processing Pipeline  
> **Engine:** `sharp` (libvips C++ backend)  
> **Status:** Specification & Implementation Baseline  
> **Applicable Modules:** `server/src/modules/media/`, `client/src/components/editor/`

---

## 1. Executive Summary & Core Objective

In a publication operating system, users upload images of vastly different quality and size:
1. **Massive / Heavy Files (e.g., 20 MB – 80 MB DSLR RAW/PNG/JPEG):** Cause severe bandwidth bloat, slow page loads, poor SEO scores, and high storage costs.
2. **Low-Quality / Low-Resolution Files (e.g., < 500px, blurry, washed out, or over-compressed):** Cause pixelation, poor legibility, and degraded reader experience.

This specification defines the **Adaptive Image Processing Pipeline** powered by `sharp`. The engine dynamically inspects incoming buffers, categorizes assets, and applies either **Lossless/Perceptual Compression & Downscaling** or **Smart Upscaling, Contrast Normalization & Unsharp Masking**.

---

## 2. Processing Decision Matrix

```text
                                Incoming Image Buffer
                                         │
                        [Magic-Byte Security Validation]
                                         │
                        [Sharp Metadata Inspection (Probe)]
                           (width, height, channels, bytes)
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  [TIER 1: MASSIVE]             [TIER 2: STANDARD]              [TIER 3: LOW QUALITY]
  Size > 5MB OR Dim > 2560px     500KB - 5MB / 800px - 2560px    Dim < 600px OR low contrast
        │                                │                                │
  • Lanczos-3 Downscale (2560px) • Format Convert (WebP)         • 2x/3x Lanczos Upscale
  • Strip EXIF / ICC metadata    • Quality: 85%                  • Unsharp Mask (Sharpen)
  • WebP Compression (82%)       • Strip bloat                   • Dynamic Range Normalization
  • Progressive Scan                                             • Noise Reduction
        │                                │                       • High-Fidelity 95% WebP
        └────────────────────────────────┼────────────────────────────────┘
                                         ▼
                     [Multi-Resolution Derivatives Generator]
                     ├── Thumbnail (400px WebP)
                     ├── Standard (1200px WebP)
                     ├── Retina (2048px WebP)
                     └── Master Optimized (Original Aspect)
```

---

## 3. Detailed Processing Modes

### Tier 1: Heavy / Massive Images (80MB $\rightarrow$ < 800KB)
* **Threshold:** File size $> 5\text{ MB}$ OR $\text{width}/\text{height} > 2560\text{px}$.
* **Operations:**
  1. **Dimension Clamping:** Resized to maximum bounding box of `2560 × 2560` using `fit: 'inside'`, `kernel: sharp.kernel.lanczos3`.
  2. **Metadata Stripping:** Strips camera EXIF, GPS coordinates, thumbnail caches, and raw XML profiles.
  3. **Format Modernization:** Converted to **WebP** with `quality: 82`, `effort: 6`, `smartSubsample: true`.
  4. **Result:** Reduces 80MB files by **95% – 99%** with zero perceptible human-eye quality degradation.

### Tier 2: Standard Production Web Images
* **Threshold:** File size $500\text{ KB} - 5\text{ MB}$ AND dimensions between $600\text{px} - 2560\text{px}$.
* **Operations:**
  1. Preserves original dimensions.
  2. Re-encodes into progressive **WebP** at `quality: 85`.
  3. Strips tracking metadata.

### Tier 3: Low-Quality / Low-Resolution Images (Enhancement & Upscaling)
* **Threshold:** Dimensions $< 600\text{px}$ width/height OR low contrast/blurry.
* **Operations:**
  1. **Smart Super-Resolution Upscale:** Scaled up using `sharp.kernel.lanczos3` to minimum standard editorial width ($1200\text{px}$).
  2. **Unsharp Masking (Sharpening):**
     ```typescript
     sharp(buffer).sharpen({
       sigma: 1.5,     // Radius of the blur / edge detection
       m1: 1.0,        // Flat area sharpening threshold
       m2: 2.0         // Jagged edge sharpening threshold
     })
     ```
  3. **Contrast Normalization (Histogram Equalization):**
     ```typescript
     sharp(buffer).normalize() // Enhances dynamic range for washed-out images
     ```
  4. **High-Fidelity Output:** Encoded at `quality: 95` with `chromaSubsampling: '4:4:4'` to avoid adding compression artifacts to an already sensitive image.

---

## 4. Architecture Implementation in Gazette

### 4.1 Service Component: `ImageProcessorService`
Location: `server/src/modules/media/utils/image-processor.util.ts`

```typescript
import sharp from 'sharp';

export interface ProcessedImageResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: string;
  appliedEnhancements: string[];
}

export async function processAndOptimizeImage(
  inputBuffer: Buffer,
  originalName: string,
): Promise<ProcessedImageResult> {
  const originalSize = inputBuffer.length;
  const image = sharp(inputBuffer, { failOnError: false });
  const metadata = await image.metadata();

  const width = metadata.width || 1200;
  const height = metadata.height || 800;
  const appliedEnhancements: string[] = [];

  let pipeline = image.rotate(); // Automatically correct EXIF orientation

  // 1. TIER 1: DOWNSCALE & COMPRESS HEAVY IMAGES
  if (originalSize > 5 * 1024 * 1024 || width > 2560 || height > 2560) {
    pipeline = pipeline.resize(2560, 2560, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
    appliedEnhancements.push('LANCZOS3_DOWNSCALE_2560');
  }

  // 2. TIER 3: ENHANCE & UPSCALE LOW-RES / SMALL IMAGES
  else if (width < 600 || height < 400) {
    const scaleFactor = Math.min(3, Math.ceil(1200 / width));
    pipeline = pipeline
      .resize(width * scaleFactor, height * scaleFactor, {
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen({ sigma: 1.2, m1: 1.0, m2: 2.0 })
      .normalize();

    appliedEnhancements.push('LANCZOS3_UPSCALE', 'UNSHARP_MASK', 'CONTRAST_NORMALIZE');
  }

  // 3. TIER 2: STANDARD SHARPENING POLISH
  else {
    pipeline = pipeline.sharpen({ sigma: 0.8 });
    appliedEnhancements.push('SUBTLE_SHARPEN');
  }

  // 4. WEBP FORMAT ENCODING
  const isSmall = width < 600;
  const outputBuffer = await pipeline
    .webp({
      quality: isSmall ? 95 : 82,
      effort: 6,
      smartSubsample: true,
    })
    .toBuffer();

  const finalMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    mimeType: 'image/webp',
    extension: 'webp',
    width: finalMetadata.width || width,
    height: finalMetadata.height || height,
    originalSize,
    optimizedSize: outputBuffer.length,
    compressionRatio: `${(((originalSize - outputBuffer.length) / originalSize) * 100).toFixed(1)}%`,
    appliedEnhancements,
  };
}
```

---

## 5. Security & Resource Defense Controls

1. **Pixel Decompression Bomb Protection:**
   Sharp enforces a hard limit of `268,435,456` pixels (~16,384 × 16,384) to prevent malicious zip/decompression bomb attacks from crashing the Node.js memory heap.
2. **Re-Encoding Neutralization:**
   Malicious payloads (e.g. PHP/JS code hidden inside PNG/JPEG comments) are completely stripped and neutralized because Sharp decodes raw pixels and re-synthesizes a fresh WebP bitstream.
3. **Magic-Byte Binary Verification:**
   Before processing, the buffer signature is verified against standard image magic numbers (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `52 49 46 46` for WebP).

---

## 6. API & Response Payload Example

When an author uploads an 80MB camera photo, the `/api/media/upload` endpoint returns:

```json
{
  "id": "med_9f81bc22a",
  "filename": "media-9f81bc22a.webp",
  "originalName": "canon_raw_shot_80mb.png",
  "mimeType": "image/webp",
  "originalSize": 83886080,
  "size": 524288,
  "savings": "99.4%",
  "dimensions": {
    "width": 2560,
    "height": 1440
  },
  "url": "/uploads/media-9f81bc22a.webp",
  "enhancementsApplied": [
    "LANCZOS3_DOWNSCALE_2560",
    "STRIP_EXIF",
    "WEBP_QUANTIZATION"
  ]
}
```

---

## 7. Verification Checklist

- [x] `sharp` and `@types/sharp` installed in `server/package.json`.
- [ ] Implement `image-processor.util.ts` in `server/src/modules/media/utils/`.
- [ ] Connect `processAndOptimizeImage` to `MediaService.uploadImage()`.
- [ ] Update Multer upload size limit to support large incoming raw buffers (100MB).
- [ ] Write unit tests in `media.service.spec.ts` for heavy and low-res sample fixtures.
