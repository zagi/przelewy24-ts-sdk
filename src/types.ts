import type { P24Currency, P24Environment } from './constants';

export type {
  /**
   * ISO-4217 currency codes accepted by Przelewy24.
   *
   * Supported values: `'PLN' | 'EUR' | 'USD' | 'GBP' | 'CZK'`.
   */
  P24Currency,
  /**
   * Which Przelewy24 environment the client targets.
   *
   * `'sandbox'` points at `https://sandbox.przelewy24.pl`,
   * `'production'` at `https://secure.przelewy24.pl`.
   */
  P24Environment,
};

/**
 * Options accepted by `createClient` / `new P24Client(...)`.
 */
export interface P24ClientOptions {
  /** P24 merchant ID assigned to your account. */
  merchantId: number;
  /** Point-of-sale ID. Defaults to `merchantId` for single-POS setups. */
  posId?: number;
  /** The "Report key" from the P24 admin panel. Used for HTTP Basic auth. */
  apiKey: string;
  /** The "CRC key" from the P24 admin panel. Used to sign payloads. */
  crcKey: string;
  /** `'sandbox'` (default) or `'production'`. */
  environment?: P24Environment;
  /** Override `fetch` (handy for tests with `msw`/`undici`). */
  fetch?: typeof globalThis.fetch;
  /** Override the base URL entirely. Takes precedence over `environment`. */
  baseUrl?: string;
}

/**
 * Input for `client.registerTransaction`.
 *
 * Amount fields are integers in the smallest currency unit (groszy for PLN).
 */
export interface RegisterTransactionInput {
  /** Merchant-provided unique ID for this transaction. */
  sessionId: string;
  /** Total amount in the smallest currency unit (e.g. groszy for PLN). */
  amount: number;
  /** ISO-4217 currency code. */
  currency: P24Currency;
  /** Short order description shown to the customer. */
  description: string;
  /** Customer email. */
  email: string;
  /** ISO-3166 alpha-2 country code (e.g. `'PL'`). */
  country?: string;
  /** UI language code (e.g. `'pl'`, `'en'`). */
  language?: string;
  /** URL P24 redirects the customer to after payment. */
  urlReturn: string;
  /** Webhook URL P24 posts the transaction notification to. */
  urlStatus?: string;
  /** Time limit in minutes (`0` = no limit). */
  timeLimit?: number;
  /** Character encoding for legacy integrations. */
  encoding?: string;
  /** Optional customer name. */
  client?: string;
  /** Channels bitmask restricting available payment methods. */
  channel?: number;
  /** Optional line items; prices are in the smallest currency unit. */
  cart?: ReadonlyArray<{
    name: string;
    description?: string;
    quantity: number;
    /** Price per unit, in the smallest currency unit. */
    price: number;
    number?: number;
  }>;
}

/**
 * Output of `client.registerTransaction`.
 */
export interface RegisterTransactionResult {
  /** Opaque P24 token identifying the registered transaction. */
  token: string;
  /** Fully-qualified URL the customer should be redirected to. */
  redirectUrl: string;
}

/**
 * Input for `client.verifyTransaction`.
 */
export interface VerifyTransactionInput {
  /** Same `sessionId` used when registering the transaction. */
  sessionId: string;
  /** P24-assigned order ID, received via the webhook. */
  orderId: number;
  /** Verified amount, in the smallest currency unit. */
  amount: number;
  /** Currency of the transaction; must match registration. */
  currency: P24Currency;
}

/**
 * Input for `client.refund`.
 *
 * A single call refunds one or more individual transactions atomically.
 */
export interface RefundInput {
  /** Merchant-provided idempotency key for this refund batch. */
  requestId: string;
  /** UUID identifying the refund operation. */
  refundsUuid: string;
  /** Webhook URL P24 posts refund status updates to. */
  urlStatus?: string;
  /** Individual refunds — each tied to one order. */
  refunds: ReadonlyArray<{
    orderId: number;
    sessionId: string;
    /** Amount to refund, in the smallest currency unit. */
    amount: number;
    description: string;
  }>;
}

/**
 * Output of `client.refund`.
 */
export interface RefundResult {
  /** P24 response code; `0` means accepted. */
  responseCode: number;
  /** Per-refund outcomes, matching the order of the request. */
  data: ReadonlyArray<{
    orderId: number;
    sessionId: string;
    /** `true` when the refund was accepted by P24. */
    status: boolean;
    /** Error message when `status === false`. */
    message?: string;
  }>;
}

/**
 * Output of `client.getTransactionBySessionId`.
 */
export interface TransactionStatus {
  orderId: number;
  sessionId: string;
  /** P24 transaction status code (see P24 docs for the enumeration). */
  status: number;
  /** Amount in the smallest currency unit. */
  amount: number;
  currency: P24Currency;
  /** P24 payment method ID actually used by the customer. */
  methodId?: number;
  /** Timestamp the transaction was created. */
  date?: string;
  /** Timestamp the transaction was settled. */
  dateOfTransaction?: string;
  /** Free-form bank statement description. */
  statement?: string;
}

/**
 * Element of the array returned by `client.listPaymentMethods`.
 */
export interface PaymentMethod {
  id: number;
  name: string;
  /** `true` when the method is currently available for the merchant. */
  status: boolean;
  /** URL of the method's logo. */
  imgUrl?: string;
  /** `true` when the method is intended for mobile devices. */
  mobile?: boolean;
}

/**
 * Input for `client.chargeCard`.
 */
export interface CardChargeInput {
  /** Session ID of the transaction being charged. */
  sessionId: string;
  /** P24 order ID of the parent transaction. */
  orderId: number;
  /** Amount in the smallest currency unit. */
  amount: number;
  currency: P24Currency;
}

/**
 * Decoded shape of a P24 webhook notification posted to `urlStatus`.
 *
 * Use `verifyWebhook` from `przelewy24-ts-sdk/webhooks` to parse and
 * verify the SHA-384 signature before trusting any of these fields.
 */
export interface WebhookPayload {
  merchantId: number;
  posId: number;
  sessionId: string;
  /** Amount actually charged, in the smallest currency unit. */
  amount: number;
  /** Original transaction amount, in the smallest currency unit. */
  originAmount: number;
  currency: P24Currency;
  orderId: number;
  /** ID of the payment method the customer used. */
  methodId: number;
  /** Bank statement description. */
  statement: string;
  /** SHA-384 signature P24 computed over the rest of the payload. */
  sign: string;
}
