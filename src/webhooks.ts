import { signFields, timingSafeEqualHex } from './crypto';
import { P24SignatureError } from './errors';
import type { WebhookPayload } from './types';

/**
 * Options accepted by `verifyWebhook`.
 */
export interface VerifyWebhookOptions {
  /** Merchant ID configured on this server (used to reject wrong-tenant payloads). */
  merchantId: number;
  /** The "CRC key" from the P24 admin panel. */
  crcKey: string;
  /** Raw JSON string (preferred) or a parsed `WebhookPayload`. */
  payload: WebhookPayload | string;
}

/**
 * Verify and decode a P24 webhook notification.
 *
 * Available standalone from `'przelewy24-ts-sdk/webhooks'` so webhook
 * handlers do not need to instantiate the full SDK client. Prefer passing
 * the raw request body string — verifying after `JSON.parse` works too,
 * but a string keeps the signing-input bytes under the caller's control.
 *
 * @param options - Merchant credentials and the raw or parsed payload.
 * @returns The decoded `WebhookPayload` when the signature checks out.
 * @throws {P24SignatureError} When the payload is malformed JSON, has the
 *   wrong `merchantId`, or its SHA-384 signature does not match.
 *
 * @example
 * ```typescript
 * import { verifyWebhook } from 'przelewy24-ts-sdk/webhooks';
 *
 * const payload = verifyWebhook({
 *   merchantId: 12345,
 *   crcKey: process.env.P24_CRC_KEY ?? '',
 *   payload: rawBody,
 * });
 * ```
 */
export function verifyWebhook(options: VerifyWebhookOptions): WebhookPayload {
  const parsed = typeof options.payload === 'string' ? parseJson(options.payload) : options.payload;
  if (!isWebhookPayload(parsed)) {
    throw new P24SignatureError('Webhook payload is malformed');
  }
  if (parsed.merchantId !== options.merchantId) {
    throw new P24SignatureError('Webhook merchantId does not match configured merchantId');
  }
  const expected = signFields({
    merchantId: parsed.merchantId,
    posId: parsed.posId,
    sessionId: parsed.sessionId,
    amount: parsed.amount,
    originAmount: parsed.originAmount,
    currency: parsed.currency,
    orderId: parsed.orderId,
    methodId: parsed.methodId,
    statement: parsed.statement,
    crc: options.crcKey,
  });
  if (!timingSafeEqualHex(expected, parsed.sign)) {
    throw new P24SignatureError('Invalid webhook signature');
  }
  return parsed;
}

function parseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    throw new P24SignatureError('Webhook payload is not valid JSON');
  }
}

function isWebhookPayload(v: unknown): v is WebhookPayload {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.merchantId === 'number' &&
    typeof o.posId === 'number' &&
    typeof o.sessionId === 'string' &&
    typeof o.amount === 'number' &&
    typeof o.originAmount === 'number' &&
    typeof o.currency === 'string' &&
    typeof o.orderId === 'number' &&
    typeof o.methodId === 'number' &&
    typeof o.statement === 'string' &&
    typeof o.sign === 'string'
  );
}
