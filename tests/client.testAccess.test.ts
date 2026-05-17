import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { createClient } from '../src/index';
import { mswServer } from './setup';

describe('P24Client.testAccess', () => {
  it('returns true on 200 success against sandbox by default', async () => {
    mswServer.use(
      http.get('https://sandbox.przelewy24.pl/api/v1/testAccess', () =>
        HttpResponse.json({ data: true }),
      ),
    );
    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'c' });
    await expect(client.testAccess()).resolves.toBe(true);
  });

  it('uses production base URL when environment is production', async () => {
    let calledUrl = '';
    mswServer.use(
      http.get('https://secure.przelewy24.pl/api/v1/testAccess', ({ request }) => {
        calledUrl = request.url;
        return HttpResponse.json({ data: true });
      }),
    );
    const client = createClient({
      merchantId: 1,
      apiKey: 'k',
      crcKey: 'c',
      environment: 'production',
    });
    await client.testAccess();
    expect(calledUrl).toContain('secure.przelewy24.pl');
  });

  it('uses posId different from merchantId when provided', async () => {
    let auth: string | null = null;
    mswServer.use(
      http.get('https://sandbox.przelewy24.pl/api/v1/testAccess', ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ data: true });
      }),
    );
    const client = createClient({ merchantId: 100, posId: 200, apiKey: 'k', crcKey: 'c' });
    await client.testAccess();
    expect(auth).toBe(`Basic ${Buffer.from('200:k').toString('base64')}`);
  });

  it('throws TypeError on missing required options', () => {
    // @ts-expect-error - intentionally missing apiKey
    expect(() => createClient({ merchantId: 1, crcKey: 'c' })).toThrow(TypeError);
  });
});
