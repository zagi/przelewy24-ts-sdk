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

export class P24Client {
  private readonly transport: Transport;
  private readonly merchantId: number;
  private readonly posId: number;
  private readonly crcKey: string;
  private readonly baseUrl: string;

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

  async testAccess(): Promise<boolean> {
    return this.transport.request<boolean>('GET', P24_API_PATHS.testAccess);
  }

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

  async getTransactionBySessionId(sessionId: string): Promise<TransactionStatus> {
    return this.transport.request<TransactionStatus>(
      'GET',
      P24_API_PATHS.transactionBySession(sessionId),
    );
  }

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

  async listPaymentMethods(language = 'pl'): Promise<readonly PaymentMethod[]> {
    return this.transport.request<readonly PaymentMethod[]>(
      'GET',
      P24_API_PATHS.paymentMethods(language),
    );
  }

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

export function createClient(options: P24ClientOptions): P24Client {
  return new P24Client(options);
}
