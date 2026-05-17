import { createHash } from 'node:crypto';

/**
 * Compute the SHA-384 signature P24 expects on signed endpoints.
 *
 * P24 hashes `JSON.stringify(fields)`, so the order of keys in `fields`
 * matters — V8 preserves string-key insertion order, so callers MUST pass
 * an object literal with keys in the order P24 documents for each
 * endpoint. See the signing-rule table in the SDK README.
 *
 * @param fields - Object whose keys are inserted in P24's documented order.
 * @returns The lowercase hex-encoded SHA-384 digest of the JSON-encoded fields.
 *
 * @example
 * ```typescript
 * import { signFields } from 'przelewy24-ts-sdk';
 *
 * const sign = signFields({
 *   sessionId: 'order-1',
 *   merchantId: 12345,
 *   amount: 1099,
 *   currency: 'PLN',
 *   crc: 'your-crc-key',
 * });
 * ```
 */
export function signFields(fields: Record<string, string | number>): string {
  const json = JSON.stringify(fields);
  return createHash('sha384').update(json, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two equal-length hex strings.
 *
 * Used internally by `verifyWebhook` to compare signatures without leaking
 * timing information. Returns `false` immediately when lengths differ.
 *
 * @param a - First hex string.
 * @param b - Second hex string.
 * @returns `true` when both strings have identical length and content.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
