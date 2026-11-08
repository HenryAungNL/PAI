/**
 * Typed API client.
 *
 * Authentication strategy:
 *  - The short-lived access token is kept in memory only (never localStorage).
 *  - The long-lived refresh token lives in an HttpOnly cookie; we ask the
 *    backend to rotate it via POST /auth/refresh/ when an access token expires.
 *  - On a 401 we transparently refresh once and retry the original request.
 */
import type { ApiErrorPayload } from "@/types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(status: number, message: string, code = "error", details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the request failed because a field was invalid. */
  get isValidation() {
    return this.status === 400 && this.code === "validation_error";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip the automatic refresh-and-retry (used by the refresh call itself). */
  skipRefresh?: boolean;
  /** Send FormData (file uploads) without JSON headers. */
  formData?: BodyInit | null;
};

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }
  const err = payload?.error;
  if (err) {
    return new ApiError(response.status, err.message ?? "Request failed", err.code, err.details ?? {});
  }
  return new ApiError(response.status, response.statusText || "Request failed");
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, signal, skipRefresh, formData } = options;

  const finalHeaders: Record<string, string> = { ...headers };
  if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;

  let payload: BodyInit | undefined;
  if (formData !== undefined && formData !== null) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
    credentials: "include",
    signal,
  });

  if (response.status === 401 && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Rotate the refresh cookie and store the new access token in memory.
 * A single in-flight refresh is shared across concurrent 401s.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      });
      if (!response.ok) {
        setAccessToken(null);
        return null;
      }
      const data = (await response.json()) as { access: string };
      setAccessToken(data.access);
      return data.access;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
  upload: <T>(path: string, formData: FormData, method = "POST") =>
    request<T>(path, { method, formData }),
};

/** Build a query string, dropping empty values. */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
