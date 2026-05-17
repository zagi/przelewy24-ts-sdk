import { P24ApiError, P24NetworkError } from './errors';

export interface TransportOptions {
  baseUrl: string;
  posId: number;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

export interface Transport {
  request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T>;
}

export function createTransport(options: TransportOptions): Transport {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const authHeader = `Basic ${Buffer.from(`${options.posId}:${options.apiKey}`).toString('base64')}`;

  return {
    async request(method, path, body) {
      const url = `${options.baseUrl}${path}`;
      const headers: Record<string, string> = {
        Authorization: authHeader,
        Accept: 'application/json',
      };
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      const init: RequestInit = { method, headers };
      if (body !== undefined) init.body = JSON.stringify(body);

      let response: Response;
      try {
        response = await fetchImpl(url, init);
      } catch (cause) {
        throw new P24NetworkError(`Network error calling ${method} ${path}`, { cause });
      }

      const text = await response.text();
      const parsed = text.length > 0 ? safeJson(text) : undefined;

      if (!response.ok) {
        const code = isRecord(parsed) && typeof parsed.code === 'string' ? parsed.code : undefined;
        const message =
          isRecord(parsed) && typeof parsed.error === 'string'
            ? parsed.error
            : `Request failed with status ${response.status}`;
        const apiInit: { status: number; code?: string; body?: unknown } = {
          status: response.status,
          body: parsed,
        };
        if (code !== undefined) apiInit.code = code;
        throw new P24ApiError(message, apiInit);
      }

      if (isRecord(parsed) && 'data' in parsed) return parsed.data as never;
      return parsed as never;
    },
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
