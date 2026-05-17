import { describe, expect, it } from 'vitest';
import { signFields } from '../src/crypto';
import { type VerifyWebhookOptions, verifyWebhook } from '../src/webhooks';

const baseOptions: Omit<VerifyWebhookOptions, 'payload'> = { merchantId: 1, crcKey: 'crc' };

function signedPayload(over: Partial<Record<string, unknown>> = {}) {
  const body = {
    merchantId: 1,
    posId: 1,
    sessionId: 's',
    amount: 100,
    originAmount: 100,
    currency: 'PLN' as const,
    orderId: 42,
    methodId: 154,
    statement: 'stmt',
    ...over,
  };
  const sign = signFields({
    merchantId: body.merchantId as number,
    posId: body.posId as number,
    sessionId: body.sessionId as string,
    amount: body.amount as number,
    originAmount: body.originAmount as number,
    currency: body.currency as string,
    orderId: body.orderId as number,
    methodId: body.methodId as number,
    statement: body.statement as string,
    crc: 'crc',
  });
  return { ...body, sign };
}

describe('verifyWebhook', () => {
  it('returns parsed payload when sign matches', () => {
    const payload = signedPayload();
    const result = verifyWebhook({ ...baseOptions, payload });
    expect(result.orderId).toBe(42);
    expect(result.sessionId).toBe('s');
  });

  it('throws P24SignatureError when sign is wrong', () => {
    const payload = { ...signedPayload(), sign: 'a'.repeat(96) };
    expect(() => verifyWebhook({ ...baseOptions, payload })).toThrow('Invalid webhook signature');
  });

  it('throws when merchantId does not match', () => {
    const payload = signedPayload({ merchantId: 999 });
    expect(() => verifyWebhook({ ...baseOptions, payload })).toThrow(/merchantId/);
  });

  it('accepts a raw JSON string and parses it', () => {
    const payload = signedPayload();
    const result = verifyWebhook({ ...baseOptions, payload: JSON.stringify(payload) });
    expect(result.orderId).toBe(42);
  });

  it('throws on malformed JSON string', () => {
    expect(() => verifyWebhook({ ...baseOptions, payload: '{not json' })).toThrow(/JSON/);
  });

  it('throws on a payload missing required fields', () => {
    expect(() =>
      verifyWebhook({ ...baseOptions, payload: { merchantId: 1, sign: 'x' } as never }),
    ).toThrow(/malformed/);
  });
});
