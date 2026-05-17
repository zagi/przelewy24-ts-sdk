import { P24_API_PATHS, P24_BASE_URLS, P24_REDIRECT_PATH } from './constants';
import { signFields } from './crypto';
import { createTransport, type Transport } from './http';
import type {
  CardChargeInput,
  P24ClientOptions,
  PaymentMethod,
  RefundInput,
  RefundResult,
  RegisterTransactionInput,
  RegisterTransactionResult,
  TransactionStatus,
  VerifyTransactionInput,
} from './types';

/**
 * Main entry point of the SDK.
 *
 * Wraps the Przelewy24 REST API v1 with fully-typed methods, native
 * `fetch`, HTTP Basic auth, and SHA-384 signing. Instances are cheap to
 * keep around — they are stateless beyond the immutable options passed
 * to the constructor.
 *
 * Prefer the `createClient` factory unless you specifically want `new`.
 *
 * @example
 * ```typescript
 * import { P24Client } from 'przelewy24-ts-sdk';
 *
 * const p24 = new P24Client({
 *   merchantId: 12345,
 *   apiKey: process.env.P24_API_KEY ?? '',
 *   crcKey: process.env.P24_CRC_KEY ?? '',
 *   environment: 'sandbox',
 * });
 * ```
 */
export class P24Client {
  private readonly transport: Transport;
  private readonly merchantId: number;
  private readonly posId: number;
  private readonly crcKey: string;
  private readonly baseUrl: string;

  /**
   * @param options - Credentials and runtime configuration.
   * @throws {TypeError} When `apiKey`, `crcKey`, or `merchantId` is missing.
   */
  constructor(options: P24ClientOptions) {
    if (!options.apiKey) throw new TypeError('P24Client: apiKey is required');
    if (!options.crcKey) throw new TypeError('P24Client: crcKey is required');
    if (!options.merchantId) throw new TypeError('P24Client: merchantId is required');

    this.merchantId = options.merchantId;
    this.posId = options.posId ?? options.merchantId;
    this.crcKey = options.crcKey;
    this.baseUrl = options.baseUrl ?? P24_BASE_URLS[options.environment ?? 'sandbox'];

    const transportOptions: Parameters<typeof createTransport>[0] = {
      baseUrl: this.baseUrl,
      posId: this.posId,
      apiKey: options.apiKey,
    };
    if (options.fetch) transportOptions.fetch = options.fetch;
    this.transport = createTransport(transportOptions);
  }

  /**
   * Verify that the configured credentials are accepted by P24.
   *
   * @returns `true` when the API returns a successful 2xx response.
   * @throws {P24ApiError} On non-2xx responses (e.g. wrong `apiKey`).
   * @throws {P24NetworkError} On underlying `fetch` failures.
   *
   * @example
   * ```typescript
   * if (!(await p24.testAccess())) throw new Error('bad credentials');
   * ```
   */
  async testAccess(): Promise<boolean> {
    return this.transport.request<boolean>('GET', P24_API_PATHS.testAccess);
  }

  /**
   * Register a transaction and return the URL to redirect the customer to.
   *
   * @param input - Transaction details (amounts in the smallest currency unit).
   * @returns `{ token, redirectUrl }` — send the customer to `redirectUrl`.
   * @throws {P24ApiError} On non-2xx responses.
   * @throws {P24NetworkError} On underlying `fetch` failures.
   *
   * @example
   * ```typescript
   * const { redirectUrl } = await p24.registerTransaction({
   *   sessionId: 'order-1',
   *   amount: 1099,
   *   currency: 'PLN',
   *   description: 'Order #1',
   *   email: 'customer@example.com',
   *   urlReturn: 'https://shop.example.com/return',
   * });
   * ```
   */
  async registerTransaction(input: RegisterTransactionInput): Promise<RegisterTransactionResult> {
    const sign = signFields({
      sessionId: input.sessionId,
      merchantId: this.merchantId,
      amount: input.amount,
      currency: input.currency,
      crc: this.crcKey,
    });
    const body = { merchantId: this.merchantId, posId: this.posId, ...input, sign };
    const result = await this.transport.request<{ token: string }>(
      'POST',
      P24_API_PATHS.transactionRegister,
      body,
    );
    return {
      token: result.token,
      redirectUrl: `${this.baseUrl}${P24_REDIRECT_PATH(result.token)}`,
    };
  }

  /**
   * Confirm a transaction after the asynchronous webhook arrives.
   *
   * P24 requires this call to mark a payment as settled — without it the
   * money is held but not transferred.
   *
   * @param input - Identifiers and verified amount/currency.
   * @returns `{ status: 'success' }` on success.
   * @throws {P24ApiError} On non-2xx responses (e.g. amount mismatch).
   * @throws {P24NetworkError} On underlying `fetch` failures.
   *
   * @example
   * ```typescript
   * await p24.verifyTransaction({
   *   sessionId: 'order-1',
   *   orderId: 987654,
   *   amount: 1099,
   *   currency: 'PLN',
   * });
   * ```
   */
  async verifyTransaction(input: VerifyTransactionInput): Promise<{ status: 'success' }> {
    const sign = signFields({
      sessionId: input.sessionId,
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      crc: this.crcKey,
    });
    const body = { merchantId: this.merchantId, posId: this.posId, ...input, sign };
    await this.transport.request('PUT', P24_API_PATHS.transactionVerify, body);
    return { status: 'success' };
  }

  /**
   * Look up the current status of a transaction by merchant session ID.
   *
   * @param sessionId - The merchant-provided session identifier.
   * @returns The current `TransactionStatus`.
   * @throws {P24ApiError} On non-2xx responses (e.g. not found).
   * @throws {P24NetworkError} On underlying `fetch` failures.
   *
   * @example
   * ```typescript
   * const status = await p24.getTransactionBySessionId('order-1');
   * ```
   */
  async getTransactionBySessionId(sessionId: string): Promise<TransactionStatus> {
    return this.transport.request<TransactionStatus>(
      'GET',
      P24_API_PATHS.transactionBySession(sessionId),
    );
  }

  /**
   * Refund one or more transactions in a single batch call.
   *
   * The signature is computed over the sum of `refunds[].amount` against
   * the fixed currency `PLN` — matching what P24's refund endpoint expects.
   *
   * @param input - Refund batch (idempotency key, UUID, per-order entries).
   * @returns The `RefundResult` describing per-refund outcomes.
   * @throws {P24ApiError} On non-2xx responses.
   * @throws {P24NetworkError} On underlying `fetch` failures.
   *
   * @example
   * ```typescript
   * await p24.refund({
   *   requestId: 'refund-1',
   *   refundsUuid: '8c8b1f70-0000-4000-8000-000000000001',
   *   refunds: [
   *     { orderId: 987654, sessionId: 'order-1', amount: 500, description: 'Partial' },
   *   ],
   * });
   * ```
   */
  async refund(input: RefundInput): Promise<RefundResult> {
    const totalAmount = input.refunds.reduce((sum, r) => sum + r.amount, 0);
    const currency = 'PLN';
    const sign = signFields({
      requestId: input.requestId,
      refundsUuid: input.refundsUuid,
      amount: totalAmount,
      currency,
      crc: this.crcKey,
    });
    const body = { ...input, sign };
    return this.transport.request<RefundResult>('POST', P24_API_PATHS.refund, body);
  }

  /**
   * List payment methods enabled for the merchant.
   *
   * @param language - UI language code for human-readable names. Defaults to `'pl'`.
   * @returns A readonly array of `PaymentMethod` entries.
   * @throws {P24ApiError} On non-2xx responses.
   * @throws {P24NetworkError} On underlying `fetch` failures.
   *
   * @example
   * ```typescript
   * const methods = await p24.listPaymentMethods('en');
   * ```
   */
  async listPaymentMethods(language = 'pl'): Promise<readonly PaymentMethod[]> {
    return this.transport.request<readonly PaymentMethod[]>(
      'GET',
      P24_API_PATHS.paymentMethods(language),
    );
  }

  /**
   * Charge a previously-tokenised card for a registered transaction.
   *
   * Used for recurring billing and one-click checkout flows where the
   * customer has already authorised a card under an earlier transaction.
   *
   * @param input - Session ID, order ID, amount, and currency of the charge.
   * @returns `{ orderId }` — the new P24 order ID for the charge.
   * @throws {P24ApiError} On non-2xx responses (e.g. card declined).
   * @throws {P24NetworkError} On underlying `fetch` failures.
   *
   * @example
   * ```typescript
   * const { orderId } = await p24.chargeCard({
   *   sessionId: 'subscription-1',
   *   orderId: 987654,
   *   amount: 1999,
   *   currency: 'PLN',
   * });
   * ```
   */
  async chargeCard(input: CardChargeInput): Promise<{ orderId: number }> {
    const sign = signFields({
      sessionId: input.sessionId,
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      crc: this.crcKey,
    });
    const body = { merchantId: this.merchantId, posId: this.posId, ...input, sign };
    return this.transport.request<{ orderId: number }>('POST', P24_API_PATHS.cardCharge, body);
  }
}

/**
 * Factory that returns a fully-configured `P24Client`.
 *
 * Equivalent to `new P24Client(options)` — provided as a function so the
 * SDK feels at home in module-scope `const p24 = createClient(...)` setups.
 *
 * @param options - Credentials and runtime configuration.
 * @returns A new `P24Client` instance.
 * @throws {TypeError} When required credentials are missing.
 *
 * @example
 * ```typescript
 * import { createClient } from 'przelewy24-ts-sdk';
 *
 * const p24 = createClient({
 *   merchantId: 12345,
 *   apiKey: process.env.P24_API_KEY ?? '',
 *   crcKey: process.env.P24_CRC_KEY ?? '',
 * });
 * ```
 */
export function createClient(options: P24ClientOptions): P24Client {
  return new P24Client(options);
}
