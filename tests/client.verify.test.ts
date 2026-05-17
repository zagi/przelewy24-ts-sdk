import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { signFields } from '../src/crypto';
import { createClient } from '../src/index';
import { mswServer } from './setup';

describe('P24Client.verifyTransaction', () => {
  it('PUTs with the right sign and resolves on success', async () => {
    let received: unknown = null;
    mswServer.use(
      http.put('https://sandbox.przelewy24.pl/api/v1/transaction/verify', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: { status: 'success' } });
      }),
    );

    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'crc' });
    await expect(
      client.verifyTransaction({ sessionId: 's', orderId: 42, amount: 100, currency: 'PLN' }),
    ).resolves.toEqual({ status: 'success' });

    const expectedSign = signFields({
      sessionId: 's',
      orderId: 42,
      amount: 100,
      currency: 'PLN',
      crc: 'crc',
    });
    expect(received).toMatchObject({ orderId: 42, amount: 100, sign: expectedSign });
  });
});
