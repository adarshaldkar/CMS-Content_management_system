import * as http from 'http';
import * as https from 'https';
import * as dns from 'dns';
import * as net from 'net';
import { BadRequestException } from '@nestjs/common';

/**
 * Decodes an IPv4-mapped IPv6 address (RFC 4291 §2.5.5.2) into a dotted-quad
 * string. Handles both the dotted-quad tail (`::ffff:127.0.0.1`) and the
 * hex-octet tail (`::ffff:0a00:0001` / `::ffff:a00:1`). Returns null when the
 * tail is not a well-formed 32-bit IPv4 encoding.
 */
function mappedIpv4ToDotted(ip: string): string | null {
  const idx = ip.toLowerCase().indexOf('ffff:');
  if (idx === -1) return null;
  const tail = ip.slice(idx + 5).trim();

  if (tail.includes('.')) {
    // Dotted-quad tail, e.g. ::ffff:10.0.0.1
    return net.isIPv4(tail) ? tail : null;
  }

  // Hex-octet tail, e.g. 0a00:0001 (10.0.0.1)
  const groups = tail.split(':').filter(Boolean);
  if (groups.length === 0 || groups.length > 2) return null;
  if (groups.some((g) => g.length > 4 || !/^[0-9a-f]{1,4}$/i.test(g))) return null;

  const packed = parseInt(groups[0] || '0', 16) * 0x10000 + parseInt(groups[1] || '0', 16);
  if (packed > 0xffffffff || packed < 0) return null;

  return `${(packed >>> 24) & 0xff}.${(packed >>> 16) & 0xff}.${(packed >>> 8) & 0xff}.${packed & 0xff}`;
}

/**
 * Checks if an IPv4 or IPv6 string falls within a private, loopback, link-local,
 * or cloud metadata IP range.
 */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1). Malformed mapped
  // tails fail closed (treated as private) rather than slipping through as public.
  if (ip.startsWith('::ffff:')) {
    const dotted = mappedIpv4ToDotted(ip);
    if (!dotted) return true;
    ip = dotted;
  }

  // Handle IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((part) => parseInt(part, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private Class A)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private Class C)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-Local & AWS/GCP Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;

    return false;
  }

  // Handle IPv6
  const lower = ip.toLowerCase();
  // Loopback (::1)
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Unspecified (::)
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
  // Unique Local Address (fc00::/7 -> fc.. and fd..)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // Link-Local Address (fe80::/10 -> fe8.., fe9.., fea.., feb..)
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates syntactic constraints on the URL:
 * - Must be http: or https:
 * - Must not contain embedded credentials (user:pass@host)
 * - Port must be default (80 or 443) or omitted
 * - Hostname <= 253 chars
 */
export function validateUrlSyntactics(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Only HTTP and HTTPS protocols are supported.');
  }

  if (parsed.username || parsed.password) {
    throw new BadRequestException('URLs with embedded credentials are not allowed.');
  }

  if (parsed.hostname.length > 253) {
    throw new BadRequestException('Hostname exceeds maximum allowable length.');
  }

  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new BadRequestException('Non-standard ports are prohibited for security.');
  }

  return parsed;
}

/**
 * Resolves a hostname via DNS and verifies that all resolved IP addresses are public.
 */
export async function resolveSafeIp(hostname: string): Promise<string> {
  // If hostname is already an IP address, validate it directly
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new BadRequestException(`Access to IP address [${hostname}] is forbidden.`);
    }
    return hostname;
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new BadRequestException(`Could not resolve domain [${hostname}]: ${err.message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new BadRequestException(`No IP addresses found for domain [${hostname}].`);
  }

  for (const addr of addresses) {
    if (isPrivateIp(addr.address)) {
      throw new BadRequestException(
        `Domain [${hostname}] resolves to a forbidden private IP address [${addr.address}].`,
      );
    }
  }

  return addresses[0].address;
}

export interface SafeFetchOptions {
  maxRedirects?: number;
  timeoutMs?: number;
  maxBytes?: number;
  allowedContentTypes?: string[];
  headers?: Record<string, string>;
}

/**
 * Executes a secure HTTP/HTTPS GET request with:
 * - Pre-flight DNS validation + socket IP pinning (prevents DNS Rebinding)
 * - Stream-based byte counting (destroys socket if > maxBytes)
 * - Strict timeout enforcement
 * - Recursive redirect re-validation
 * - Content-Type filtering
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {},
): Promise<{ text: string; contentType: string; finalUrl: string; statusCode: number }> {
  const maxRedirects = options.maxRedirects ?? 3;
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxBytes = options.maxBytes ?? 3 * 1024 * 1024; // 3MB
  const allowedContentTypes = options.allowedContentTypes ?? [
    'text/html',
    'application/json',
    'application/xml',
    'text/xml',
    'text/plain',
  ];

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const parsed = validateUrlSyntactics(currentUrl);
    const safeIp = await resolveSafeIp(parsed.hostname);

    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;

    const requestResult = await new Promise<{
      text: string;
      contentType: string;
      statusCode: number;
      redirectUrl?: string;
    }>((resolve, reject) => {
      let isSettled = false;
      let byteCounter = 0;
      let chunks: Buffer[] = [];

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
          reject(new BadRequestException(`Request timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      const defaultHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      // Create request with custom lookup returning the pinned safe IP
      const req = transport.request(
        currentUrl,
        {
          method: 'GET',
          headers: {
            ...defaultHeaders,
            ...(options.headers || {}),
          },
          lookup: (_hostname, _opts, callback) => {
            callback(null, safeIp, net.isIPv6(safeIp) ? 6 : 4);
          },
        },
        (res) => {
          const statusCode = res.statusCode || 200;

          // Check for Redirects (301, 302, 303, 307, 308)
          if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
            clearTimeout(timer);
            const nextUrl = new URL(res.headers.location, currentUrl).toString();
            res.resume(); // Drain stream
            if (!isSettled) {
              isSettled = true;
              resolve({ text: '', contentType: '', statusCode, redirectUrl: nextUrl });
            }
            return;
          }

          if (statusCode >= 400) {
            clearTimeout(timer);
            res.resume();
            if (!isSettled) {
              isSettled = true;
              reject(new BadRequestException(`External server responded with HTTP ${statusCode}`));
            }
            return;
          }

          const rawContentType = res.headers['content-type'] || 'text/html';
          const contentType = rawContentType.split(';')[0].trim().toLowerCase();

          // Validate Content-Type
          const isAllowed = allowedContentTypes.some((allowed) =>
            contentType.includes(allowed.toLowerCase()),
          );
          if (!isAllowed) {
            clearTimeout(timer);
            res.resume();
            if (!isSettled) {
              isSettled = true;
              reject(
                new BadRequestException(
                  `Unsupported response Content-Type [${contentType}]. Expected HTML/JSON.`,
                ),
              );
            }
            return;
          }

          res.on('data', (chunk: Buffer) => {
            byteCounter += chunk.length;
            if (byteCounter > maxBytes) {
              clearTimeout(timer);
              res.destroy();
              req.destroy();
              if (!isSettled) {
                isSettled = true;
                reject(
                  new BadRequestException(
                    `Response size exceeded maximum allowable limit (${Math.round(
                      maxBytes / (1024 * 1024),
                    )}MB).`,
                  ),
                );
              }
              return;
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            clearTimeout(timer);
            if (!isSettled) {
              isSettled = true;
              const fullBuffer = Buffer.concat(chunks);
              const text = fullBuffer.toString('utf8');
              resolve({ text, contentType, statusCode });
            }
          });

          res.on('error', (err) => {
            clearTimeout(timer);
            if (!isSettled) {
              isSettled = true;
              reject(new BadRequestException(`Stream read error: ${err.message}`));
            }
          });
        },
      );

      req.on('error', (err) => {
        clearTimeout(timer);
        if (!isSettled) {
          isSettled = true;
          reject(new BadRequestException(`Network request failed: ${err.message}`));
        }
      });

      req.end();
    });

    if (requestResult.redirectUrl) {
      redirectsCount++;
      if (redirectsCount > maxRedirects) {
        throw new BadRequestException(`Exceeded maximum redirect limit of ${maxRedirects} hops.`);
      }
      currentUrl = requestResult.redirectUrl;
      continue;
    }

    return {
      text: requestResult.text,
      contentType: requestResult.contentType,
      finalUrl: currentUrl,
      statusCode: requestResult.statusCode,
    };
  }

  throw new BadRequestException('Exceeded maximum allowable redirect hops.');
}
