import { signFields, timingSafeEqualHex } from './crypto';
import { P24SignatureError } from './errors';
import type { WebhookPayload } from './types';

export interface VerifyWebhookOptions {
  merchantId: number;
  crcKey: string;
  payload: WebhookPayload | string;
}

/**
 * Verify a P24 webhook notification.
 *
 * Throws `P24SignatureError` on any mismatch — malformed JSON, wrong
 * merchantId, or invalid SHA-384 signature. Available standalone via
 * `import { verifyWebhook } from 'przelewy24-ts-sdk/webhooks'` so webhook
 * handlers don't need to instantiate the full SDK client.
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
