import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, buildQuery, getAccessToken, setAccessToken } from "@/lib/api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("buildQuery", () => {
  it("drops empty values and encodes the rest", () => {
    expect(buildQuery({ page: 1, search: "react", status: undefined, empty: "" })).toBe("?page=1&search=react");
  });

  it("returns an empty string when nothing is provided", () => {
    expect(buildQuery({})).toBe("");
  });
});

describe("access token memory store", () => {
  afterEach(() => setAccessToken(null));

  it("stores and returns the token without persistence", () => {
    setAccessToken("abc");
    expect(getAccessToken()).toBe("abc");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

describe("ApiError", () => {
  it("exposes validation errors explicitly", () => {
    expect(new ApiError(400, "no", "validation_error").isValidation).toBe(true);
    expect(new ApiError(400, "no", "other").isValidation).toBe(false);
  });
});

describe("api request behaviour", () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => setAccessToken(null));

  it("parses a successful JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get<{ ok: boolean }>("/courses/")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/courses/", expect.objectContaining({ method: "GET" }));
  });

  it("attaches the bearer token when one is stored", async () => {
    setAccessToken("secret-token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/users/me/");

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer secret-token" });
  });

  it("wraps a structured error body in an ApiError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: { code: "validation_error", message: "Bad input" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.post("/auth/login/", {})).rejects.toMatchObject({
      status: 400,
      code: "validation_error",
      message: "Bad input",
    });
  });

  it("refreshes once on a 401 and retries the original request", async () => {
    const fetchMock = vi
      .fn()
      // 1) original request -> 401
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      // 2) refresh call -> new access token
      .mockResolvedValueOnce(jsonResponse(200, { access: "fresh" }))
      // 3) retried request -> success
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get<{ ok: boolean }>("/users/me/")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/auth/refresh/");
    expect(getAccessToken()).toBe("fresh");
  });

  it("surfaces the original error when a refresh cannot recover", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get("/users/me/")).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBeNull();
  });
});
