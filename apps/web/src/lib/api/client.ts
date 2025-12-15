/**
 * Typed API Client for SaaS Boilerplate
 * 
 * Provides a type-safe fetch wrapper with:
 * - Automatic auth header injection
 * - Consistent error handling
 * - Type-safe responses matching ApiResponse<T> format
 * 
 * Requirements: 9.1, 9.2
 */

import type { ApiResponse, ApiError, PaginationMeta } from '@saas/shared';

/**
 * API Client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
}

/**
 * Query params type - allows any object with primitive values
 */
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * Request options for API calls
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: QueryParams;
  signal?: AbortSignal;
}

/**
 * API Error class for client-side error handling
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly requestId?: string;

  constructor(
    error: ApiError,
    statusCode: number,
    requestId?: string
  ) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.statusCode = statusCode;
    this.details = error.details;
    this.requestId = requestId;
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.code === 'UNAUTHORIZED';
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.statusCode === 429 || this.code === 'RATE_LIMIT_EXCEEDED';
  }

  /**
   * Get validation field errors if available
   */
  getFieldErrors(): Record<string, string[]> | null {
    if (this.isValidationError() && this.details?.fields) {
      return this.details.fields as Record<string, string[]>;
    }
    return null;
  }
}

/**
 * Network error for connection failures
 */
export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Create an API client instance
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getToken, onUnauthorized } = config;

  /**
   * Build URL with query parameters
   */
  function buildUrl(
    endpoint: string,
    params?: QueryParams
  ): string {
    const url = new URL(endpoint, baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Build request headers with auth token
   */
  function buildHeaders(customHeaders?: Record<string, string>): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...customHeaders,
    });

    const token = getToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Parse API response and handle errors
   */
  async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data: ApiResponse<T>;
    
    try {
      data = await response.json();
    } catch {
      throw new NetworkError('Failed to parse response');
    }

    // Handle unauthorized responses
    if (response.status === 401) {
      onUnauthorized?.();
    }

    // If response indicates failure, throw ApiClientError
    if (!data.success && data.error) {
      throw new ApiClientError(
        data.error,
        response.status,
        data.meta?.requestId
      );
    }

    return data;
  }

  /**
   * Make a GET request
   */
  async function get<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, options?.params);
    const headers = buildHeaders(options?.headers);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: options?.signal,
      });

      return parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  /**
   * Make a POST request
   */
  async function post<T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, options?.params);
    const headers = buildHeaders(options?.headers);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      });

      return parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  /**
   * Make a PATCH request
   */
  async function patch<T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, options?.params);
    const headers = buildHeaders(options?.headers);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      });

      return parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  /**
   * Make a PUT request
   */
  async function put<T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, options?.params);
    const headers = buildHeaders(options?.headers);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      });

      return parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  /**
   * Make a DELETE request
   */
  async function del<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, options?.params);
    const headers = buildHeaders(options?.headers);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        signal: options?.signal,
      });

      return parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  /**
   * Upload a file with multipart/form-data
   */
  async function upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint, options?.params);
    
    // Don't set Content-Type for FormData - browser will set it with boundary
    const headers = new Headers(options?.headers);
    const token = getToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: options?.signal,
      });

      return parseResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }

  return {
    get,
    post,
    patch,
    put,
    delete: del,
    upload,
    buildUrl,
  };
}

/**
 * Type for the API client instance
 */
export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Helper to extract data from successful response
 */
export function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error('Cannot unwrap unsuccessful response');
  }
  return response.data;
}

/**
 * Helper to get pagination from response
 */
export function getPagination(response: ApiResponse<unknown>): PaginationMeta | null {
  return response.meta?.pagination ?? null;
}
