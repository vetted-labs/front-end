import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllAuthState,
  clearExpertSessionTokens,
  clearTokenAuthState,
  storeExpertAuthState,
} from "@/lib/auth";

describe("expert auth state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores expert bearer auth and clears stale candidate/company identities", () => {
    localStorage.setItem("candidateId", "candidate-1");
    localStorage.setItem("candidateEmail", "candidate@example.com");
    localStorage.setItem("companyAuthToken", "old-company-token");
    localStorage.setItem("companyId", "company-1");
    const listener = vi.fn();
    window.addEventListener("auth-token-refreshed", listener);

    storeExpertAuthState({
      accessToken: "expert-access-token",
      refreshToken: "expert-refresh-token",
      expertId: "expert-1",
      walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      email: "expert@example.com",
      status: "approved",
    });

    expect(localStorage.getItem("authToken")).toBe("expert-access-token");
    expect(localStorage.getItem("refreshToken")).toBe("expert-refresh-token");
    expect(localStorage.getItem("userType")).toBe("expert");
    expect(localStorage.getItem("expertId")).toBe("expert-1");
    expect(localStorage.getItem("expertEmail")).toBe("expert@example.com");
    expect(localStorage.getItem("expertStatus")).toBe("approved");
    expect(localStorage.getItem("candidateId")).toBeNull();
    expect(localStorage.getItem("candidateEmail")).toBeNull();
    expect(localStorage.getItem("companyAuthToken")).toBeNull();
    expect(localStorage.getItem("companyId")).toBeNull();
    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener("auth-token-refreshed", listener);
  });

  it("clears stored expert email on full logout cleanup", () => {
    localStorage.setItem("expertEmail", "expert@example.com");

    clearAllAuthState();

    expect(localStorage.getItem("expertEmail")).toBeNull();
  });

  it("preserves expert access and refresh tokens when clearing non-expert login state", () => {
    localStorage.setItem("userType", "expert");
    localStorage.setItem("authToken", "expert-access-token");
    localStorage.setItem("refreshToken", "expert-refresh-token");
    localStorage.setItem("candidateId", "candidate-1");
    localStorage.setItem("companyAuthToken", "company-token");

    clearTokenAuthState({ preserveExpertSession: true });

    expect(localStorage.getItem("authToken")).toBe("expert-access-token");
    expect(localStorage.getItem("refreshToken")).toBe("expert-refresh-token");
    expect(localStorage.getItem("candidateId")).toBeNull();
    expect(localStorage.getItem("companyAuthToken")).toBeNull();
  });

  it("does not preserve candidate tokens when entering the expert wallet flow", () => {
    localStorage.setItem("userType", "candidate");
    localStorage.setItem("authToken", "candidate-access-token");
    localStorage.setItem("refreshToken", "candidate-refresh-token");

    clearTokenAuthState({ preserveExpertSession: true });

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("clears stale expert tokens without disconnecting the wallet", () => {
    localStorage.setItem("authToken", "stale-token");
    localStorage.setItem("refreshToken", "stale-refresh");
    localStorage.setItem("expertId", "expert-1");
    localStorage.setItem("expertEmail", "expert@example.com");
    localStorage.setItem("expertStatus", "approved");
    localStorage.setItem("walletAddress", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    clearExpertSessionTokens();

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("expertId")).toBeNull();
    expect(localStorage.getItem("expertEmail")).toBeNull();
    expect(localStorage.getItem("expertStatus")).toBeNull();
    expect(localStorage.getItem("walletAddress")).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  });
});
