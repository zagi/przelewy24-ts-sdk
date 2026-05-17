import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { signFields } from '../src/crypto';
import { createClient } from '../src/index';
import { mswServer } from './setup';

describe('P24Client.refund', () => {
  it('POSTs refund body with total amount and correct sign', async () => {
    let received: unknown = null;
    mswServer.use(
      http.post('https://sandbox.przelewy24.pl/api/v1/transaction/refund', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({
          data: { responseCode: 0, data: [{ orderId: 1, sessionId: 's-1', status: true }] },
        });
      }),
    );
    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'crc' });
    const out = await client.refund({
      requestId: 'req-1',
      refundsUuid: 'uuid-1',
      refunds: [
        { orderId: 1, sessionId: 's-1', amount: 600, description: 'partial' },
        { orderId: 1, sessionId: 's-1', amount: 400, description: 'partial' },
      ],
    });
    expect(out.responseCode).toBe(0);
    const expectedSign = signFields({
      requestId: 'req-1',
      refundsUuid: 'uuid-1',
      amount: 1000,
      currency: 'PLN',
      crc: 'crc',
    });
    expect(received).toMatchObject({ requestId: 'req-1', sign: expectedSign });
  });
});
