import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { createClient } from '../src/index';
import { mswServer } from './setup';

describe('P24Client.getTransactionBySessionId', () => {
  it('GETs the session URL and returns the transaction record', async () => {
    mswServer.use(
      http.get('https://sandbox.przelewy24.pl/api/v1/transaction/by/sessionId/abc', () =>
        HttpResponse.json({
          data: { orderId: 1, sessionId: 'abc', status: 1, amount: 100, currency: 'PLN' },
        }),
      ),
    );
    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'crc' });
    await expect(client.getTransactionBySessionId('abc')).resolves.toMatchObject({
      orderId: 1,
      sessionId: 'abc',
    });
  });

  it('URL-encodes the session id', async () => {
    mswServer.use(
      http.get('https://sandbox.przelewy24.pl/api/v1/transaction/by/sessionId/a%2Fb%20c', () =>
        HttpResponse.json({
          data: { orderId: 1, sessionId: 'a/b c', status: 1, amount: 100, currency: 'PLN' },
        }),
      ),
    );
    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'crc' });
    await expect(client.getTransactionBySessionId('a/b c')).resolves.toBeDefined();
  });
});
