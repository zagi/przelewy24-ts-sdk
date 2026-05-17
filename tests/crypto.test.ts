import { describe, expect, it } from 'vitest';
import { signFields, timingSafeEqualHex } from '../src/crypto';

describe('signFields', () => {
  it('produces SHA-384 hex of the JSON-stringified fields in the given order', () => {
    const result = signFields({ a: 1, b: 'x' });
    expect(result).toMatch(/^[0-9a-f]{96}$/);
    expect(result).toBe(
      'e1b181ed05acf7f7feef1f6c1e19365e2d9918164ada6a7a2dcf840be239720c89f8da33647e5ad76c40a7d2938c9e94',
    );
  });

  it('hashes the P24 register payload in documented field order', () => {
    const sign = signFields({
      sessionId: 'order-001',
      merchantId: 12345,
      amount: 1000,
      currency: 'PLN',
      crc: 'a1b2c3d4e5f60718',
    });
    expect(sign).toBe(
      '025246ab13151058f5dc6d887924062de27598af3169f8d75f944029d52790c59b24e50646c1ec6375f3e33fea19e71b',
    );
  });

  it('changes when field order changes (insertion order matters)', () => {
    const a = signFields({ x: 1, y: 2 });
    const b = signFields({ y: 2, x: 1 });
    expect(a).not.toBe(b);
  });
});

describe('timingSafeEqualHex', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqualHex('abc123', 'abc123')).toBe(true);
  });
  it('returns false for unequal strings of same length', () => {
    expect(timingSafeEqualHex('abc123', 'abc124')).toBe(false);
  });
  it('returns false for strings of different length without leaking timing', () => {
    expect(timingSafeEqualHex('abc', 'abcd')).toBe(false);
  });
});
