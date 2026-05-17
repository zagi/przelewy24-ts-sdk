import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { signFields } from '../src/crypto';
import { createClient } from '../src/index';
import { mswServer } from './setup';

describe('P24Client.chargeCard', () => {
  it('POSTs to /card/charge with sign and returns orderId', async () => {
    let received: unknown = null;
    mswServer.use(
      http.post('https://sandbox.przelewy24.pl/api/v1/card/charge', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: { orderId: 9999 } });
      }),
    );
    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'crc' });
    const result = await client.chargeCard({
      sessionId: 's',
      orderId: 5,
      amount: 100,
      currency: 'PLN',
    });
    expect(result.orderId).toBe(9999);
    const expected = signFields({
      sessionId: 's',
      orderId: 5,
      amount: 100,
      currency: 'PLN',
      crc: 'crc',
    });
    expect(received).toMatchObject({ sign: expected });
  });
});
