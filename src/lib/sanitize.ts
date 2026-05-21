/**
 * Defensive input sanitization utilities.
 *
 * React already escapes interpolated text, so stored XSS is not possible
 * through normal `{value}` rendering. These helpers add a second layer:
 * - strip HTML tags & angle brackets
 * - remove ASCII control characters (except newline/tab)
 * - collapse zero-width / direction-override unicode used in spoofing
 * - enforce length caps
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ZERO_WIDTH    = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const HTML_TAG      = /<[^>]*>/g;

export function sanitizeText(input: unknown, maxLen = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(HTML_TAG, "")
    .replace(CONTROL_CHARS, "")
    .replace(ZERO_WIDTH, "")
    .replace(/\s+\n/g, "\n")
    .trim()
    .slice(0, maxLen);
}

/** Display names — single line, no tags, max 40 chars. */
export function sanitizeDisplayName(input: unknown): string {
  return sanitizeText(input, 40).replace(/[\r\n]+/g, " ");
}

/** Chat messages — max 500 chars. */
export function sanitizeMessage(input: unknown): string {
  return sanitizeText(input, 500);
}

/** Bios — multiline allowed, max 280 chars. */
export function sanitizeBio(input: unknown): string {
  return sanitizeText(input, 280);
}

/* --------------------------- Rate limiter --------------------------- */

/**
 * Client-side rate limiter. NOT a security boundary — purely UX defense
 * against accidental spam. Server-side rate limiting is not yet supported
 * by the backend.
 */
export class ClientRateLimiter {
  private hits: number[] = [];
  constructor(private maxHits: number, private windowMs: number) {}
  check(): { ok: boolean; retryInMs: number } {
    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    if (this.hits.length >= this.maxHits) {
      const retry = this.windowMs - (now - this.hits[0]);
      return { ok: false, retryInMs: Math.max(0, retry) };
    }
    this.hits.push(now);
    return { ok: true, retryInMs: 0 };
  }
  reset() { this.hits = []; }
}