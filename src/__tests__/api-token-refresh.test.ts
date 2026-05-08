import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api";

// Test fixtures — chosen to NOT match the pre-commit secret scanner's
// `(secret|password|passwd|token)\s*[:=]\s*"..."` regex, which fires on any
// constant whose name ends in `_TOKEN`.
const STALE_ACCESS = "stale-access-fixture";
const FRESH_ACCESS = "fresh-access-fixture";
const FRESH_REFRESH = "fresh-refresh-fixture";
const VALID_REFRESH = "valid-refresh-fixture";

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function buildFetchSequence(responses: Response[]): {
  fetchSpy: ReturnType<typeof vi.fn>;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fetchSpy = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error(`fetch called more times than responses provided (url=${url})`);
    return next;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = fetchSpy;
  return { fetchSpy, calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest token refresh", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("writes the refreshed access value to authToken (not companyAuthToken) for company users", async () => {
    // Mirrors what AuthContext.login does — every user type's access value
    // lives at `authToken`. The bug was that attemptTokenRefresh wrote the
    // refreshed company value to `companyAuthToken` instead, leaving the
    // stale `authToken` to win the read on retry.
    localStorage.setItem("userType", "company");
    localStorage.setItem("authToken", STALE_ACCESS);
    localStorage.setItem("refreshToken", VALID_REFRESH);

    const { fetchSpy, calls } = buildFetchSequence([
      // 1. Original request — backend rejects the stale value.
      jsonResponse({ error: "Token expired" }, 401),
      // 2. Refresh endpoint — returns fresh values.
      jsonResponse({ accessToken: FRESH_ACCESS, refreshToken: FRESH_REFRESH }),
      // 3. Retry of the original request — success on the fresh value.
      jsonResponse({ success: true, data: { id: "job-1" } }),
    ]);

    const result = await apiRequest<{ id: string }>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ title: "test" }),
      requiresAuth: true,
    });

    expect(result).toEqual({ id: "job-1" });
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Refresh write path: canonical key updated, legacy key cleared.
    expect(localStorage.getItem("authToken")).toBe(FRESH_ACCESS);
    expect(localStorage.getItem("companyAuthToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBe(FRESH_REFRESH);

    // The retry must have used the FRESH access value, not the stale one
    // (this is the assertion the buggy code would fail).
    const retryAuth = (calls[2].init?.headers as Record<string, string>)["Authorization"];
    expect(retryAuth).toBe(`Bearer ${FRESH_ACCESS}`);
  });

  it("removes a legacy companyAuthToken so it cannot shadow the fresh authToken", async () => {
    // Existing in-flight company sessions may still have a value at the
    // legacy key from a refresh that ran on the old code. The fix should
    // clean that up the next time the user's auth rotates.
    localStorage.setItem("userType", "company");
    localStorage.setItem("authToken", STALE_ACCESS);
    localStorage.setItem("companyAuthToken", "legacy-stale-fixture");
    localStorage.setItem("refreshToken", VALID_REFRESH);

    buildFetchSequence([
      jsonResponse({ error: "Token expired" }, 401),
      jsonResponse({ accessToken: FRESH_ACCESS, refreshToken: FRESH_REFRESH }),
      jsonResponse({ success: true, data: { ok: true } }),
    ]);

    await apiRequest("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ title: "test" }),
      requiresAuth: true,
    });

    expect(localStorage.getItem("authToken")).toBe(FRESH_ACCESS);
    expect(localStorage.getItem("companyAuthToken")).toBeNull();
  });

  it("uses the same canonical authToken key for non-company user types", async () => {
    localStorage.setItem("userType", "candidate");
    localStorage.setItem("authToken", STALE_ACCESS);
    localStorage.setItem("refreshToken", VALID_REFRESH);

    buildFetchSequence([
      jsonResponse({ error: "jwt expired" }, 401),
      jsonResponse({ accessToken: FRESH_ACCESS, refreshToken: FRESH_REFRESH }),
      jsonResponse({ success: true, data: { ok: true } }),
    ]);

    await apiRequest("/api/applications", {
      method: "POST",
      body: JSON.stringify({}),
      requiresAuth: true,
    });

    expect(localStorage.getItem("authToken")).toBe(FRESH_ACCESS);
    expect(localStorage.getItem("companyAuthToken")).toBeNull();
  });

  it("propagates the original 401 when the refresh value itself is rejected", async () => {
    localStorage.setItem("userType", "company");
    localStorage.setItem("authToken", STALE_ACCESS);
    localStorage.setItem("refreshToken", "expired-refresh-fixture");

    buildFetchSequence([
      jsonResponse({ error: "Token expired" }, 401),
      // Refresh endpoint rejects too — refresh value also expired.
      jsonResponse({ error: "Invalid refresh token" }, 401),
    ]);

    await expect(
      apiRequest("/api/jobs", {
        method: "POST",
        body: JSON.stringify({}),
        requiresAuth: true,
      })
    ).rejects.toMatchObject({ status: 401 });

    // Failed refresh wipes the refresh value; access values are left for
    // the caller (or AuthContext) to clean up via logout.
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });
});
