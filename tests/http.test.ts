import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { P24NetworkError } from '../src/errors';
import { createTransport } from '../src/http';
import { mswServer } from './setup';

const baseUrl = 'https://sandbox.przelewy24.pl';

describe('createTransport', () => {
  it('sends HTTP Basic auth with posId:apiKey', async () => {
    let received: string | null = null;
    mswServer.use(
      http.get(`${baseUrl}/api/v1/testAccess`, ({ request }) => {
        received = request.headers.get('authorization');
        return HttpResponse.json({ data: true });
      }),
    );
    const transport = createTransport({ baseUrl, posId: 42, apiKey: 'secret' });
    await transport.request('GET', '/api/v1/testAccess');
    const expected = `Basic ${Buffer.from('42:secret').toString('base64')}`;
    expect(received).toBe(expected);
  });

  it('unwraps `data` envelope from successful JSON responses', async () => {
    mswServer.use(
      http.get(`${baseUrl}/api/v1/testAccess`, () => HttpResponse.json({ data: { ok: true } })),
    );
    const transport = createTransport({ baseUrl, posId: 1, apiKey: 'k' });
    const result = await transport.request<{ ok: boolean }>('GET', '/api/v1/testAccess');
    expect(result).toEqual({ ok: true });
  });

  it('throws P24ApiError on non-2xx with parsed body, status, and code', async () => {
    mswServer.use(
      http.put(`${baseUrl}/api/v1/transaction/verify`, () =>
        HttpResponse.json({ error: 'Incorrect signature', code: 'ERR_SIGN' }, { status: 400 }),
      ),
    );
    const transport = createTransport({ baseUrl, posId: 1, apiKey: 'k' });
    await expect(
      transport.request('PUT', '/api/v1/transaction/verify', { foo: 'bar' }),
    ).rejects.toMatchObject({
      name: 'P24ApiError',
      status: 400,
      code: 'ERR_SIGN',
      body: { error: 'Incorrect signature', code: 'ERR_SIGN' },
    });
  });

  it('wraps fetch failures as P24NetworkError preserving cause', async () => {
    const failingFetch: typeof fetch = () => Promise.reject(new TypeError('network down'));
    const transport = createTransport({ baseUrl, posId: 1, apiKey: 'k', fetch: failingFetch });
    await expect(transport.request('GET', '/api/v1/testAccess')).rejects.toBeInstanceOf(
      P24NetworkError,
    );
  });

  it('sends JSON body with Content-Type when body is provided', async () => {
    let receivedBody: unknown = null;
    let contentType: string | null = null;
    mswServer.use(
      http.post(`${baseUrl}/api/v1/transaction/register`, async ({ request }) => {
        receivedBody = await request.json();
        contentType = request.headers.get('content-type');
        return HttpResponse.json({ data: { token: 't' } });
      }),
    );
    const transport = createTransport({ baseUrl, posId: 1, apiKey: 'k' });
    await transport.request('POST', '/api/v1/transaction/register', { sessionId: 'x' });
    expect(receivedBody).toEqual({ sessionId: 'x' });
    expect(contentType).toContain('application/json');
  });
});
