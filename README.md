# @zagi_14/przelewy24-ts-sdk

Modern, fully-typed Przelewy24 (P24) payments SDK for Node.js — zero dependencies, native fetch, ESM + CJS.

[![npm version](https://img.shields.io/npm/v/@zagi_14/przelewy24-ts-sdk)](https://www.npmjs.com/package/@zagi_14/przelewy24-ts-sdk)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@zagi_14/przelewy24-ts-sdk)](https://bundlephobia.com/package/@zagi_14/przelewy24-ts-sdk)
[![CI](https://github.com/zagi/przelewy24-ts-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/zagi/przelewy24-ts-sdk/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@zagi_14/przelewy24-ts-sdk)](./LICENSE)

## Why this SDK

Przelewy24 only ships official SDKs for iOS and Android — there is no first-party Node.js or TypeScript library. The most popular community alternative, `node-przelewy24`, has been effectively unmaintained for years: it still pins axios 0.21, declares Node 13 types, and is missing the card-charge and payment-methods endpoints that real production integrations need today. This SDK is a clean rewrite for modern JavaScript runtimes. It has zero runtime dependencies, uses the platform's native `fetch`, covers the full P24 REST v1 surface (including card-charge), ships both ESM and CJS builds with `.d.ts` types, and exposes rich TypeScript types for every request and response.

## Install

```bash
pnpm add @zagi_14/przelewy24-ts-sdk
# or
npm install @zagi_14/przelewy24-ts-sdk
```

Requires Node.js `>=20.11` (or any runtime with a global `fetch` and `node:crypto`).

## Quick start

```typescript
import { createClient, isP24Error } from '@zagi_14/przelewy24-ts-sdk';
import { verifyWebhook } from '@zagi_14/przelewy24-ts-sdk/webhooks';

const p24 = createClient({
  merchantId: 12345,
  posId: 12345,
  apiKey: process.env.P24_API_KEY!,
  crcKey: process.env.P24_CRC_KEY!,
  environment: 'sandbox',
});

// 1. Register a transaction and redirect the customer to P24.
const { redirectUrl } = await p24.registerTransaction({
  sessionId: 'order-2026-0001',
  amount: 1099, // 10.99 PLN expressed in groszy
  currency: 'PLN',
  description: 'Order #1',
  email: 'customer@example.com',
  urlReturn: 'https://shop.example.com/return',
  urlStatus: 'https://shop.example.com/api/p24/webhook',
});

// Send the customer to `redirectUrl`.

// 2. Handle the asynchronous webhook from P24.
async function onWebhook(rawBody: string): Promise<void> {
  const payload = verifyWebhook({
    merchantId: 12345,
    crcKey: process.env.P24_CRC_KEY!,
    payload: rawBody,
  });

  // 3. Confirm the transaction once the webhook is verified.
  try {
    await p24.verifyTransaction({
      sessionId: payload.sessionId,
      orderId: payload.orderId,
      amount: payload.amount,
      currency: payload.currency,
    });
  } catch (error) {
    if (isP24Error(error)) {
      console.error('P24 verify failed', error.name, error.message);
    }
    throw error;
  }
}

// 4. Issue a refund later if needed.
await p24.refund({
  requestId: 'refund-2026-0001',
  refundsUuid: '8c8b1f70-0000-4000-8000-000000000001',
  refunds: [
    {
      orderId: 987654,
      sessionId: 'order-2026-0001',
      amount: 1099,
      description: 'Customer requested refund',
    },
  ],
});
```

## API reference

### `createClient(options)` / `new P24Client(options)`

Both forms create a fully-configured client. `createClient` is a convenience factory; `P24Client` is the underlying class if you prefer `new`.

| Parameter      | Type                          | Required | Description                                                                  |
| -------------- | ----------------------------- | -------- | ---------------------------------------------------------------------------- |
| `merchantId`   | `number`                      | yes      | P24 merchant ID assigned to your account.                                    |
| `posId`        | `number`                      | no       | Point-of-sale ID. Defaults to `merchantId` (the common single-POS setup).    |
| `apiKey`       | `string`                      | yes      | The "Report key" from the P24 admin panel.                                   |
| `crcKey`       | `string`                      | yes      | The "CRC key" used to sign requests and verify webhooks.                     |
| `environment`  | `'sandbox' \| 'production'`   | no       | Selects the base URL. Defaults to `'sandbox'`.                               |
| `baseUrl`      | `string`                      | no       | Overrides the base URL entirely (useful for tests / proxies).                |
| `fetch`        | `typeof fetch`                | no       | Inject a custom `fetch` implementation (e.g. `undici`, `msw`).               |

Returns: `P24Client`.

```typescript
import { createClient } from '@zagi_14/przelewy24-ts-sdk';

const p24 = createClient({
  merchantId: 12345,
  apiKey: process.env.P24_API_KEY!,
  crcKey: process.env.P24_CRC_KEY!,
  environment: 'production',
});
```

### `client.testAccess()`

Pings `GET /api/v1/testAccess` to verify that credentials are valid.

Returns: `Promise<boolean>` — `true` when credentials are accepted.

```typescript
const ok = await p24.testAccess();
```

### `client.registerTransaction(input)`

Creates a transaction and returns the redirect URL the customer should be sent to.

| Parameter      | Type                          | Required | Description                                                                     |
| -------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------- |
| `sessionId`    | `string`                      | yes      | Merchant-provided unique ID for this transaction.                               |
| `amount`       | `number`                      | yes      | Total amount in the smallest currency unit (groszy for PLN).                    |
| `currency`     | `P24Currency`                 | yes      | One of `'PLN' \| 'EUR' \| 'USD' \| 'GBP' \| 'CZK'`.                             |
| `description`  | `string`                      | yes      | Short order description shown to the customer.                                  |
| `email`        | `string`                      | yes      | Customer email.                                                                 |
| `urlReturn`    | `string`                      | yes      | URL P24 redirects the customer to after payment.                                |
| `urlStatus`    | `string`                      | no       | Webhook URL P24 posts the transaction notification to.                          |
| `country`      | `string`                      | no       | ISO-3166 alpha-2 country code (e.g. `'PL'`).                                    |
| `language`     | `string`                      | no       | UI language code (e.g. `'pl'`, `'en'`).                                         |
| `timeLimit`    | `number`                      | no       | Time limit in minutes (`0` = no limit).                                         |
| `encoding`     | `string`                      | no       | Character encoding for legacy integrations.                                     |
| `client`       | `string`                      | no       | Optional customer name.                                                         |
| `channel`      | `number`                      | no       | Channels bitmask restricting available payment methods.                         |
| `cart`         | `ReadonlyArray<CartItem>`     | no       | Optional line items (name, quantity, price in groszy).                          |

Returns: `Promise<RegisterTransactionResult>` — `{ token, redirectUrl }`.

```typescript
const { token, redirectUrl } = await p24.registerTransaction({
  sessionId: 'order-1',
  amount: 1099,
  currency: 'PLN',
  description: 'Order #1',
  email: 'customer@example.com',
  urlReturn: 'https://shop.example.com/return',
});
```

### `client.verifyTransaction(input)`

Confirms a transaction after the webhook arrives. P24 requires this call to mark the payment as settled.

| Parameter   | Type          | Required | Description                                              |
| ----------- | ------------- | -------- | -------------------------------------------------------- |
| `sessionId` | `string`      | yes      | The same `sessionId` used in `registerTransaction`.      |
| `orderId`   | `number`      | yes      | The P24-assigned order ID from the webhook payload.      |
| `amount`    | `number`      | yes      | The verified amount in the smallest currency unit.       |
| `currency`  | `P24Currency` | yes      | Must match the registered currency.                      |

Returns: `Promise<{ status: 'success' }>`.

```typescript
await p24.verifyTransaction({
  sessionId: 'order-1',
  orderId: 987654,
  amount: 1099,
  currency: 'PLN',
});
```

### `client.getTransactionBySessionId(sessionId)`

Looks up the current status of a transaction by merchant session ID.

| Parameter   | Type     | Required | Description                                |
| ----------- | -------- | -------- | ------------------------------------------ |
| `sessionId` | `string` | yes      | The merchant-provided session identifier.  |

Returns: `Promise<TransactionStatus>`.

```typescript
const status = await p24.getTransactionBySessionId('order-1');
console.log(status.orderId, status.status);
```

### `client.refund(input)`

Refunds one or more transactions in a single batch request.

| Parameter     | Type                         | Required | Description                                                          |
| ------------- | ---------------------------- | -------- | -------------------------------------------------------------------- |
| `requestId`   | `string`                     | yes      | Merchant-provided idempotency key for this refund batch.             |
| `refundsUuid` | `string`                     | yes      | UUID identifying the refund operation.                               |
| `refunds`     | `ReadonlyArray<RefundEntry>` | yes      | Individual refunds: `{ orderId, sessionId, amount, description }`.   |
| `urlStatus`   | `string`                     | no       | Webhook URL that P24 posts refund status updates to.                 |

Returns: `Promise<RefundResult>` — `{ responseCode, data: [{ orderId, sessionId, status, message? }] }`.

```typescript
await p24.refund({
  requestId: 'refund-1',
  refundsUuid: '8c8b1f70-0000-4000-8000-000000000001',
  refunds: [
    { orderId: 987654, sessionId: 'order-1', amount: 500, description: 'Partial refund' },
  ],
});
```

### `client.listPaymentMethods(language?)`

Lists payment methods available for the configured merchant.

| Parameter  | Type     | Required | Description                                                |
| ---------- | -------- | -------- | ---------------------------------------------------------- |
| `language` | `string` | no       | UI language code for human-readable names. Default `'pl'`. |

Returns: `Promise<readonly PaymentMethod[]>`.

```typescript
const methods = await p24.listPaymentMethods('en');
for (const method of methods) {
  console.log(method.id, method.name, method.status);
}
```

### `client.chargeCard(input)`

Charges a previously-tokenised card for a registered transaction (recurring / one-click payments).

| Parameter   | Type          | Required | Description                                            |
| ----------- | ------------- | -------- | ------------------------------------------------------ |
| `sessionId` | `string`      | yes      | The session ID of the transaction to charge.           |
| `orderId`   | `number`      | yes      | The P24 order ID of the parent transaction.            |
| `amount`    | `number`      | yes      | Amount to charge, in the smallest currency unit.       |
| `currency`  | `P24Currency` | yes      | Currency of the charge.                                |

Returns: `Promise<{ orderId: number }>`.

```typescript
const { orderId } = await p24.chargeCard({
  sessionId: 'subscription-1',
  orderId: 987654,
  amount: 1999,
  currency: 'PLN',
});
```

## Webhooks

P24 sends an asynchronous notification (the "transaction status" webhook) to the `urlStatus` you registered. You **must** verify the SHA-384 signature on every webhook before trusting any field. The standalone helper at `@zagi_14/przelewy24-ts-sdk/webhooks` does not require an SDK client instance, so it is cheap to call from edge runtimes and serverless handlers.

```typescript
import type { Request, Response } from 'express';
import { verifyWebhook } from '@zagi_14/przelewy24-ts-sdk/webhooks';
import { isP24Error } from '@zagi_14/przelewy24-ts-sdk';

export function p24WebhookHandler(req: Request, res: Response): void {
  try {
    const payload = verifyWebhook({
      merchantId: Number(process.env.P24_MERCHANT_ID),
      crcKey: process.env.P24_CRC_KEY ?? '',
      payload: req.body as string, // raw body, registered with express.text()
    });
    // payload is a fully-typed WebhookPayload — enqueue verifyTransaction here.
    void payload;
    res.status(200).end();
  } catch (error) {
    if (isP24Error(error)) {
      res.status(400).end();
      return;
    }
    throw error;
  }
}
```

If you are on Nuxt or Next.js, the framework adapters below wrap this helper into a typed event handler so you do not have to deal with raw bodies yourself.

## Environments

| Environment   | Base URL                          | When to use                                                                |
| ------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `sandbox`     | `https://sandbox.przelewy24.pl`   | Default. Test transactions, free, isolated P24 sandbox account.            |
| `production`  | `https://secure.przelewy24.pl`    | Real money. Set `environment: 'production'` in the client options.         |

To obtain credentials, log into the [P24 admin panel](https://panel.przelewy24.pl), then go to **My Account → My Data → API Data and Configuration**. You need three values:

- `posId` — usually the same as your `merchantId` for a single-POS setup.
- `apiKey` — listed as the **Report key** in the admin panel.
- `crcKey` — listed as the **CRC key** in the admin panel.

## Amounts and currencies

All `amount` fields across the SDK are **integers** expressed in the smallest unit of the currency: groszy for PLN, cents for EUR / USD / GBP, halerze for CZK. So `1099` means 10.99 PLN, **not** 1099 PLN. Always store amounts as integers in your database too — never multiply floats by 100 at the API boundary.

Supported currencies: `PLN`, `EUR`, `USD`, `GBP`, `CZK`.

## Errors

Every error thrown by the SDK is a subclass of `P24Error`. Use the `isP24Error` type guard to narrow `unknown` from a `catch` block.

| Class                | When it throws                                                       | Properties                       |
| -------------------- | -------------------------------------------------------------------- | -------------------------------- |
| `P24ApiError`        | P24 returned a non-2xx HTTP response.                                | `status`, `code?`, `body?`       |
| `P24NetworkError`    | The underlying `fetch` rejected (DNS, socket, timeout, etc.).        | `cause`                          |
| `P24SignatureError`  | Webhook payload is malformed, has a wrong `merchantId`, or bad sign. | —                                |
| `isP24Error(e)`      | Type guard that matches any of the above.                            | —                                |

```typescript
import { isP24Error, P24ApiError } from '@zagi_14/przelewy24-ts-sdk';

try {
  await p24.registerTransaction({
    sessionId: 'order-1',
    amount: 1099,
    currency: 'PLN',
    description: 'Order #1',
    email: 'customer@example.com',
    urlReturn: 'https://shop.example.com/return',
  });
} catch (error) {
  if (error instanceof P24ApiError) {
    console.error(error.status, error.code, error.body);
  } else if (isP24Error(error)) {
    console.error(error.name, error.message);
  } else {
    throw error;
  }
}
```

## Signing rules

P24 signs every request body and webhook with SHA-384 over a JSON-encoded subset of the payload, in a documented field order. The SDK does this for you, but the table below is a useful reference for anyone verifying signatures by hand (or in another language).

| Endpoint / event       | Hashed fields, in order                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `transaction/register` | `sessionId, merchantId, amount, currency, crc`                                                   |
| `transaction/verify`   | `sessionId, orderId, amount, currency, crc`                                                      |
| `transaction/refund`   | `requestId, refundsUuid, amount, currency, crc`                                                  |
| webhook notification   | `merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement, crc`|
| `card/charge`          | `sessionId, orderId, amount, currency, crc`                                                      |

The signature is `sha384(JSON.stringify({ ...fieldsInOrder })).digest('hex')`. The SDK exposes `signFields` from the public surface if you need to reproduce a signature in test code:

```typescript
import { signFields } from '@zagi_14/przelewy24-ts-sdk';

const sign = signFields({
  sessionId: 'order-1',
  merchantId: 12345,
  amount: 1099,
  currency: 'PLN',
  crc: 'your-crc-key',
});
```

## Framework adapters

- [`nuxt-przelewy24`](https://github.com/zagi/nuxt-przelewy24) — Nuxt 4 module that wires this SDK into `useP24()` server composables and a verified webhook event handler.
- [`next-przelewy24`](https://github.com/zagi/next-przelewy24) — Next.js 15 App Router helpers and a typed route handler for the webhook endpoint.

## Contributing

```bash
pnpm install
pnpm test:coverage
pnpm check
pnpm build
```

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`). Please do **not** add `Co-Authored-By` trailers — the commit log is the source of truth for `CHANGELOG.md` generation and keeping it clean matters.

## License

MIT © 2026 Michał Zagalski
