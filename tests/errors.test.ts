import { describe, expect, it } from 'vitest';
import { isP24Error, P24ApiError, P24NetworkError, P24SignatureError } from '../src/errors';

describe('P24 errors', () => {
  it('P24ApiError carries status code, body, and request id', () => {
    const err = new P24ApiError('Bad Request', {
      status: 400,
      code: 'ERR_INVALID',
      body: { error: 'x' },
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('P24ApiError');
    expect(err.status).toBe(400);
    expect(err.code).toBe('ERR_INVALID');
    expect(err.body).toEqual({ error: 'x' });
  });

  it('isP24Error narrows to any of the three subclasses', () => {
    expect(isP24Error(new P24ApiError('a', { status: 500 }))).toBe(true);
    expect(isP24Error(new P24NetworkError('n', { cause: new Error('x') }))).toBe(true);
    expect(isP24Error(new P24SignatureError('s'))).toBe(true);
    expect(isP24Error(new Error('plain'))).toBe(false);
  });
});
