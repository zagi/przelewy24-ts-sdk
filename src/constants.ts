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

export const P24_BASE_URLS = {
  sandbox: 'https://sandbox.przelewy24.pl',
  production: 'https://secure.przelewy24.pl',
} as const;

export const P24_REDIRECT_PATH = (token: string) => `/trnRequest/${encodeURIComponent(token)}`;

export type P24Environment = 'sandbox' | 'production';
export type P24Currency = 'PLN' | 'EUR' | 'USD' | 'GBP' | 'CZK';
