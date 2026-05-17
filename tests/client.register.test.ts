import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { signFields } from '../src/crypto';
import { createClient } from '../src/index';
import { mswServer } from './setup';

describe('P24Client.registerTransaction', () => {
  it('POSTs the signed payload and returns token + redirectUrl', async () => {
    let received: unknown = null;
    mswServer.use(
      http.post(
        'https://sandbox.przelewy24.pl/api/v1/transaction/register',
        async ({ request }) => {
          received = await request.json();
          return HttpResponse.json({ data: { token: 'tok-abc123' } });
        },
      ),
    );

    const client = createClient({ merchantId: 1234, apiKey: 'k', crcKey: 'crc-key' });
    const result = await client.registerTransaction({
      sessionId: 'order-1',
      amount: 1099,
      currency: 'PLN',
      description: 'Order #1',
      email: 'a@b.test',
      urlReturn: 'https://shop.test/return',
    });

    expect(result).toEqual({
      token: 'tok-abc123',
      redirectUrl: 'https://sandbox.przelewy24.pl/trnRequest/tok-abc123',
    });

    const expectedSign = signFields({
      sessionId: 'order-1',
      merchantId: 1234,
      amount: 1099,
      currency: 'PLN',
      crc: 'crc-key',
    });
    expect(received).toMatchObject({
      merchantId: 1234,
      posId: 1234,
      sessionId: 'order-1',
      amount: 1099,
      currency: 'PLN',
      sign: expectedSign,
    });
  });

  it('builds the production redirect URL when configured', async () => {
    mswServer.use(
      http.post('https://secure.przelewy24.pl/api/v1/transaction/register', () =>
        HttpResponse.json({ data: { token: 'prod-tok' } }),
      ),
    );
    const client = createClient({
      merchantId: 1,
      apiKey: 'k',
      crcKey: 'c',
      environment: 'production',
    });
    const out = await client.registerTransaction({
      sessionId: 's',
      amount: 100,
      currency: 'PLN',
      description: 'd',
      email: 'a@b.test',
      urlReturn: 'https://x.test',
    });
    expect(out.redirectUrl).toBe('https://secure.przelewy24.pl/trnRequest/prod-tok');
  });
});
