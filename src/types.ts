import type { P24Currency, P24Environment } from './constants';

export type { P24Currency, P24Environment };

export interface P24ClientOptions {
  merchantId: number;
  posId?: number;
  apiKey: string;
  crcKey: string;
  environment?: P24Environment;
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
}

export interface RegisterTransactionInput {
  sessionId: string;
  amount: number;
  currency: P24Currency;
  description: string;
  email: string;
  country?: string;
  language?: string;
  urlReturn: string;
  urlStatus?: string;
  timeLimit?: number;
  encoding?: string;
  client?: string;
  channel?: number;
  cart?: ReadonlyArray<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
    number?: number;
  }>;
}

export interface RegisterTransactionResult {
  token: string;
  redirectUrl: string;
}

export interface VerifyTransactionInput {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: P24Currency;
}

export interface RefundInput {
  requestId: string;
  refundsUuid: string;
  urlStatus?: string;
  refunds: ReadonlyArray<{
    orderId: number;
    sessionId: string;
    amount: number;
    description: string;
  }>;
}

export interface RefundResult {
  responseCode: number;
  data: ReadonlyArray<{
    orderId: number;
    sessionId: string;
    status: boolean;
    message?: string;
  }>;
}

export interface TransactionStatus {
  orderId: number;
  sessionId: string;
  status: number;
  amount: number;
  currency: P24Currency;
  methodId?: number;
  date?: string;
  dateOfTransaction?: string;
  statement?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  status: boolean;
  imgUrl?: string;
  mobile?: boolean;
}

export interface CardChargeInput {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: P24Currency;
}

export interface WebhookPayload {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: P24Currency;
  orderId: number;
  methodId: number;
  statement: string;
  sign: string;
}
