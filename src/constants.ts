/**
 * URL paths for the Przelewy24 REST API v1.
 *
 * Exported so callers can build URLs in tests, mocks, or logging without
 * hard-coding strings. The `transactionBySession` and `paymentMethods`
 * entries are factory functions that URL-encode their input.
 */
export const P24_API_PATHS = {
  testAccess: '/api/v1/testAccess',
  transactionRegister: '/api/v1/transaction/register',
  transactionVerify: '/api/v1/transaction/verify',
  transactionBySession: (sessionId: string) =>
    `/api/v1/transaction/by/sessionId/${encodeURIComponent(sessionId)}`,
  refund: '/api/v1/transaction/refund',
  paymentMethods: (lang: string) => `/api/v1/payment/methods/${encodeURIComponent(lang)}`,
  cardCharge: '/api/v1/card/charge',
} as const;

/**
 * Base URLs for each Przelewy24 environment.
 *
 * Selected automatically by `P24Client` based on `options.environment`,
 * but exported so tests can build absolute URLs without re-typing them.
 */
export const P24_BASE_URLS = {
  sandbox: 'https://sandbox.przelewy24.pl',
  production: 'https://secure.przelewy24.pl',
} as const;

/**
 * Build the customer-facing redirect path for a registered transaction token.
 *
 * @param token - The token returned from `transaction/register`.
 * @returns The path component to append to the environment base URL.
 */
export const P24_REDIRECT_PATH = (token: string) => `/trnRequest/${encodeURIComponent(token)}`;

/** Which Przelewy24 environment the client targets. */
export type P24Environment = 'sandbox' | 'production';
/** ISO-4217 currency codes accepted by Przelewy24. */
export type P24Currency = 'PLN' | 'EUR' | 'USD' | 'GBP' | 'CZK';
