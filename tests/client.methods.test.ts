import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { createClient } from '../src/index';
import { mswServer } from './setup';

describe('P24Client.listPaymentMethods', () => {
  it('returns the list for the given language', async () => {
    mswServer.use(
      http.get('https://sandbox.przelewy24.pl/api/v1/payment/methods/en', () =>
        HttpResponse.json({ data: [{ id: 154, name: 'BLIK', status: true }] }),
      ),
    );
    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'crc' });
    const methods = await client.listPaymentMethods('en');
    expect(methods).toEqual([{ id: 154, name: 'BLIK', status: true }]);
  });

  it('defaults to Polish (pl) when no language is passed', async () => {
    let called = '';
    mswServer.use(
      http.get('https://sandbox.przelewy24.pl/api/v1/payment/methods/pl', ({ request }) => {
        called = request.url;
        return HttpResponse.json({ data: [] });
      }),
    );
    const client = createClient({ merchantId: 1, apiKey: 'k', crcKey: 'crc' });
    await client.listPaymentMethods();
    expect(called).toContain('/payment/methods/pl');
  });
});
