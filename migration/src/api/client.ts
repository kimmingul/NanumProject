import { Readable } from 'node:stream';
import { Logger } from '../utils/logger.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { withRetry } from '../utils/retry.js';
import { CognitoAuth } from './cognito-auth.js';

export interface ApiClientOptions {
  baseUrl: string;
  cognitoAuth: CognitoAuth;
  maxConcurrency: number;
  requestTimeoutMs: number;
  downloadTimeoutMs: number;
  logger: Logger;
}

export interface ApiResponse<T = unknown> {
  data: T;
  statusCode: number;
  headers: Record<string, string>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public responseBody?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private baseUrl: string;
  private cognitoAuth: CognitoAuth;
  private requestTimeoutMs: number;
  private downloadTimeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.cognitoAuth = options.cognitoAuth;
    this.logger = options.logger;
    this.requestTimeoutMs = options.requestTimeoutMs;
    this.downloadTimeoutMs = options.downloadTimeoutMs;
    this.rateLimiter = new RateLimiter(options.maxConcurrency);
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number>,
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);

    await this.rateLimiter.acquire();
    try {
      const response = await withRetry(
        () => this.fetchWithTimeout(url, this.requestTimeoutMs),
        this.logger,
        {},
        `GET ${path}`,
      );

      const headers = this.parseHeaders(response.headers);

      if (response.status === 429) {
        const retryAfter = parseInt(headers['retry-after'] || '60', 10) * 1000;
        this.logger.warn(`Rate limited on ${path}, waiting ${retryAfter}ms`);
        await this.rateLimiter.pauseFor(retryAfter);
        this.rateLimiter.release();
        return this.get<T>(path, params);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ApiClientError(
          `HTTP ${response.status} on GET ${path}`,
          response.status,
          path,
          body,
        );
      }

      const data = (await response.json()) as T;

      this.logger.debug(`GET ${path} -> ${response.status}`, {
        params,
        status: response.status,
      });

      return { data, statusCode: response.status, headers };
    } finally {
      this.rateLimiter.release();
    }
  }

  async getStream(path: string): Promise<{ stream: Readable; headers: Record<string, string> }> {
    const url = this.buildUrl(path);
    return this.getStreamFromUrl(url, path);
  }

  async getStreamFromUrl(fullUrl: string, label?: string): Promise<{ stream: Readable; headers: Record<string, string> }> {
    const displayLabel = label ?? fullUrl;

    await this.rateLimiter.acquire();
    try {
      const response = await this.fetchWithTimeout(fullUrl, this.downloadTimeoutMs);

      if (!response.ok) {
        this.rateLimiter.release();
        throw new ApiClientError(
          `HTTP ${response.status} on GET ${displayLabel} (stream)`,
          response.status,
          displayLabel,
        );
      }

      const headers = this.parseHeaders(response.headers);

      if (!response.body) {
        this.rateLimiter.release();
        throw new ApiClientError('No response body for stream', 0, displayLabel);
      }

      const nodeStream = Readable.fromWeb(response.body as any);

      nodeStream.on('end', () => this.rateLimiter.release());
      nodeStream.on('error', () => this.rateLimiter.release());

      return { stream: nodeStream, headers };
    } catch (err) {
      this.rateLimiter.release();
      throw err;
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number>): string {
    // Ensure baseUrl ends with / for proper URL resolution
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
    // Remove leading slash from path to concatenate properly
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(cleanPath, base);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Get fresh token (auto-refreshes if expired)
      const token = await this.cognitoAuth.getToken();

      return await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }
}
