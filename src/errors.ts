export class P24Error extends Error {
  override name = 'P24Error';
}

export class P24ApiError extends P24Error {
  override name = 'P24ApiError';
  readonly status: number;
  readonly code?: string | undefined;
  readonly body?: unknown;
  constructor(message: string, init: { status: number; code?: string; body?: unknown }) {
    super(message);
    this.status = init.status;
    this.code = init.code;
    this.body = init.body;
  }
}

export class P24NetworkError extends P24Error {
  override name = 'P24NetworkError';
  constructor(message: string, init: { cause: unknown }) {
    super(message, { cause: init.cause });
  }
}

export class P24SignatureError extends P24Error {
  override name = 'P24SignatureError';
}

export function isP24Error(value: unknown): value is P24Error {
  return value instanceof P24Error;
}
