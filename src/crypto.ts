import { createHash } from 'node:crypto';

/**
 * Compute the SHA-384 signature P24 expects on signed endpoints.
 *
 * P24 hashes `JSON.stringify(fields)`. The order of keys in the resulting
 * JSON matters — V8 preserves string-key insertion order, so callers MUST
 * pass an object literal with keys in the order P24 documents for each
 * endpoint. See the signing-rule table in the SDK README.
 */
export function signFields(fields: Record<string, string | number>): string {
  const json = JSON.stringify(fields);
  return createHash('sha384').update(json, 'utf8').digest('hex');
}

/**
 * Constant-time string comparison for signature verification.
 * Avoids timing attacks when comparing webhook `sign` values.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
