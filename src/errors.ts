/**
 * Base class for every error thrown by `przelewy24-ts-sdk`.
 *
 * Concrete errors (`P24ApiError`, `P24NetworkError`, `P24SignatureError`)
 * all extend this class, so a single `instanceof P24Error` check — or the
 * `isP24Error` type guard — is enough to catch anything the SDK throws.
 *
 * @example
 * ```typescript
 * import { P24Error } from 'przelewy24-ts-sdk';
 *
 * try {
 *   await p24.testAccess();
 * } catch (error) {
 *   if (error instanceof P24Error) {
 *     console.error(error.name, error.message);
 *   }
 * }
 * ```
 */
export class P24Error extends Error {
  override name = 'P24Error';
}

/**
 * Thrown when the Przelewy24 API returns a non-2xx HTTP response.
 *
 * Carries the HTTP status, the optional P24 error code, and the parsed
 * response body (when JSON) so callers can branch on specific failure
 * modes without re-parsing the response.
 *
 * @example
 * ```typescript
 * import { P24ApiError } from 'przelewy24-ts-sdk';
 *
 * try {
 *   await p24.verifyTransaction({ sessionId: 's', orderId: 1, amount: 100, currency: 'PLN' });
 * } catch (error) {
 *   if (error instanceof P24ApiError) {
 *     console.error(error.status, error.code, error.body);
 *   }
 * }
 * ```
 */
export class P24ApiError extends P24Error {
  override name = 'P24ApiError';
  /** HTTP status code returned by P24. */
  readonly status: number;
  /** Optional P24-specific error code parsed from the response body. */
  readonly code?: string | undefined;
  /** Parsed response body — an object when JSON, the raw string otherwise. */
  readonly body?: unknown;
  /**
   * @param message - Human-readable error message.
   * @param init - Structured failure details.
   */
  constructor(message: string, init: { status: number; code?: string; body?: unknown }) {
    super(message);
    this.status = init.status;
    this.code = init.code;
    this.body = init.body;
  }
}

/**
 * Thrown when the underlying `fetch` rejects before a response is received
 * (DNS failure, socket reset, TLS error, abort, etc.).
 *
 * The original error is attached as `cause` (via `Error`'s `options.cause`).
 *
 * @example
 * ```typescript
 * import { P24NetworkError } from 'przelewy24-ts-sdk';
 *
 * try {
 *   await p24.testAccess();
 * } catch (error) {
 *   if (error instanceof P24NetworkError) {
 *     console.error('network failure', error.cause);
 *   }
 * }
 * ```
 */
export class P24NetworkError extends P24Error {
  override name = 'P24NetworkError';
  /**
   * @param message - Human-readable error message.
   * @param init - Object carrying the original `fetch` failure as `cause`.
   */
  constructor(message: string, init: { cause: unknown }) {
    super(message, { cause: init.cause });
  }
}

/**
 * Thrown by `verifyWebhook` when a webhook payload is malformed, references
 * a different `merchantId`, or has an invalid SHA-384 signature.
 *
 * Receiving this error means the payload is **not** trustworthy — the
 * handler should respond with a 4xx and avoid acting on any of the fields.
 *
 * @example
 * ```typescript
 * import { verifyWebhook } from 'przelewy24-ts-sdk/webhooks';
 * import { P24SignatureError } from 'przelewy24-ts-sdk';
 *
 * try {
 *   verifyWebhook({ merchantId: 1, crcKey: 'k', payload: rawBody });
 * } catch (error) {
 *   if (error instanceof P24SignatureError) {
 *     return new Response(null, { status: 400 });
 *   }
 * }
 * ```
 */
export class P24SignatureError extends P24Error {
  override name = 'P24SignatureError';
}

/**
 * Type guard that narrows `unknown` to `P24Error`.
 *
 * Use it at the boundary between SDK calls and your generic error handling
 * to keep `try`/`catch` blocks type-safe without repeating `instanceof`.
 *
 * @param value - The value to test, typically an `unknown` from `catch`.
 * @returns `true` when `value` is any subclass of `P24Error`.
 *
 * @example
 * ```typescript
 * import { isP24Error } from 'przelewy24-ts-sdk';
 *
 * try {
 *   await p24.testAccess();
 * } catch (error) {
 *   if (isP24Error(error)) console.error(error.name, error.message);
 *   else throw error;
 * }
 * ```
 */
export function isP24Error(value: unknown): value is P24Error {
  return value instanceof P24Error;
}
