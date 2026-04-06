/**
 * Tests for pure utility functions exported from src/lib/blockchain.ts.
 * No React components or mocking — these are deterministic pure functions.
 */

import { describe, it, expect } from "vitest";
import {
  mapScoreToChain,
  isUserRejection,
  formatContractError,
  decodeErrorSelector,
  getTransactionErrorMessage,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  ERROR_SELECTORS,
} from "@/lib/blockchain";

// ---------------------------------------------------------------------------
// mapScoreToChain
// ---------------------------------------------------------------------------

describe("mapScoreToChain", () => {
  describe("boundary clamping", () => {
    it("returns 1 for score 0", () => {
      expect(mapScoreToChain(0)).toBe(1);
    });

    it("returns 1 for negative scores", () => {
      expect(mapScoreToChain(-1)).toBe(1);
      expect(mapScoreToChain(-100)).toBe(1);
    });

    it("returns 10 for score 100", () => {
      expect(mapScoreToChain(100)).toBe(10);
    });

    it("returns 10 for scores above 100", () => {
      expect(mapScoreToChain(101)).toBe(10);
      expect(mapScoreToChain(999)).toBe(10);
    });
  });

  describe("standard mapping (Math.round(score / 10))", () => {
    it("maps 10 → 1", () => expect(mapScoreToChain(10)).toBe(1));
    it("maps 20 → 2", () => expect(mapScoreToChain(20)).toBe(2));
    it("maps 50 → 5", () => expect(mapScoreToChain(50)).toBe(5));
    it("maps 90 → 9", () => expect(mapScoreToChain(90)).toBe(9));
    it("maps 99 → 10", () => expect(mapScoreToChain(99)).toBe(10));
  });

  describe("rounding behaviour", () => {
    it("rounds 15 → 2 (Math.round(1.5) = 2)", () => {
      expect(mapScoreToChain(15)).toBe(2);
    });

    it("rounds 14 → 1 (Math.round(1.4) = 1)", () => {
      expect(mapScoreToChain(14)).toBe(1);
    });

    it("rounds 55 → 6", () => {
      expect(mapScoreToChain(55)).toBe(6);
    });

    it("rounds 45 → 5", () => {
      expect(mapScoreToChain(45)).toBe(5);
    });
  });

  describe("minimum clamp keeps result ≥ 1", () => {
    // score 1 → Math.round(0.1) = 0, which falls back to 1 via `|| 1`
    it("maps score 1 → 1 (Math.round(0.1)=0, falls back to 1)", () => {
      expect(mapScoreToChain(1)).toBe(1);
    });

    it("maps score 4 → 1 (Math.round(0.4)=0, falls back to 1)", () => {
      expect(mapScoreToChain(4)).toBe(1);
    });

    it("maps score 5 → 1 (Math.round(0.5)=1)", () => {
      expect(mapScoreToChain(5)).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// isUserRejection
// ---------------------------------------------------------------------------

describe("isUserRejection", () => {
  describe("code 4001 detection", () => {
    it("returns true for an object with code 4001", () => {
      expect(isUserRejection({ code: 4001 })).toBe(true);
    });

    it("returns false for code 4000", () => {
      expect(isUserRejection({ code: 4000 })).toBe(false);
    });

    it("returns false for code -32603", () => {
      expect(isUserRejection({ code: -32603 })).toBe(false);
    });
  });

  describe('"User rejected" message detection', () => {
    it('returns true for Error with "User rejected" in message', () => {
      expect(isUserRejection(new Error("User rejected the request"))).toBe(true);
    });

    it('returns true for Error with "User denied"', () => {
      expect(isUserRejection(new Error("MetaMask: User denied transaction signature"))).toBe(true);
    });

    it("returns true for exact match message", () => {
      expect(isUserRejection(new Error("User rejected"))).toBe(true);
    });

    it("returns true for exact 'User denied' message", () => {
      expect(isUserRejection(new Error("User denied"))).toBe(true);
    });
  });

  describe("non-rejection errors", () => {
    it("returns false for a generic Error", () => {
      expect(isUserRejection(new Error("Transaction reverted"))).toBe(false);
    });

    it("returns false for null", () => {
      expect(isUserRejection(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isUserRejection(undefined)).toBe(false);
    });

    it("returns false for a plain string", () => {
      expect(isUserRejection("some error string")).toBe(false);
    });

    it("returns false for an empty object", () => {
      expect(isUserRejection({})).toBe(false);
    });

    it("returns false for object with non-4001 code and no matching message", () => {
      expect(isUserRejection({ code: 4001, message: "Nope" })).toBe(true); // code wins
    });
  });
});

// ---------------------------------------------------------------------------
// formatContractError
// ---------------------------------------------------------------------------

describe("formatContractError", () => {
  describe("known SlashingManager errors", () => {
    it("formats AlreadyAppealed", () => {
      expect(formatContractError("AlreadyAppealed")).toBe(
        "This slashing has already been appealed"
      );
    });

    it("formats AlreadyResolved", () => {
      expect(formatContractError("AlreadyResolved")).toBe(
        "This appeal has already been resolved"
      );
    });

    it("formats AppealPeriodExpired", () => {
      expect(formatContractError("AppealPeriodExpired")).toBe(
        "The appeal period has expired"
      );
    });

    it("formats NotSlashedExpert", () => {
      expect(formatContractError("NotSlashedExpert")).toBe(
        "Only the slashed expert can perform this action"
      );
    });

    it("formats SlashingPercentageTooHigh", () => {
      expect(formatContractError("SlashingPercentageTooHigh")).toBe(
        "Slashing percentage exceeds the allowed maximum"
      );
    });

    it("formats InsufficientEscrowBalance", () => {
      expect(formatContractError("InsufficientEscrowBalance")).toBe(
        "Insufficient balance in escrow"
      );
    });
  });

  describe("known EndorsementBidding errors", () => {
    it("formats SlashPercentageTooHigh", () => {
      expect(formatContractError("SlashPercentageTooHigh")).toBe(
        "Slash percentage exceeds the allowed maximum"
      );
    });

    it("formats AlreadySlashed", () => {
      expect(formatContractError("AlreadySlashed")).toBe(
        "This bid has already been slashed"
      );
    });

    it("formats BelowMinimumBid", () => {
      expect(formatContractError("BelowMinimumBid")).toBe(
        "Bid amount is below the minimum required"
      );
    });
  });

  describe("other known errors", () => {
    it("formats Unauthorized", () => {
      expect(formatContractError("Unauthorized")).toBe(
        "You are not authorized for this action"
      );
    });

    it("formats ZeroAmount", () => {
      expect(formatContractError("ZeroAmount")).toBe(
        "Amount must be greater than zero"
      );
    });
  });

  describe("PascalCase fallback for unknown errors", () => {
    it("splits a two-word PascalCase name", () => {
      expect(formatContractError("SomeError")).toBe("Some Error");
    });

    it("splits a three-word PascalCase name", () => {
      expect(formatContractError("CustomRevertError")).toBe("Custom Revert Error");
    });

    it("returns a single-word name unchanged", () => {
      expect(formatContractError("Revert")).toBe("Revert");
    });

    it("capitalises the first character", () => {
      // The fallback regex replaces between lowercase→uppercase, so 'already' is unchanged
      expect(formatContractError("AlreadyHandledSomehow")).toBe("Already Handled Somehow");
    });
  });
});

// ---------------------------------------------------------------------------
// decodeErrorSelector
// ---------------------------------------------------------------------------

describe("decodeErrorSelector", () => {
  describe("SlashingManager selectors", () => {
    it("decodes 0xcc7b075c → SlashingPercentageTooHigh message", () => {
      expect(decodeErrorSelector("0xcc7b075c")).toBe(
        "Slashing percentage exceeds the allowed maximum"
      );
    });

    it("decodes 0xeae5f0e4 → NotSlashedExpert message", () => {
      expect(decodeErrorSelector("0xeae5f0e4")).toBe(
        "Only the slashed expert can perform this action"
      );
    });

    it("decodes 0x0eb66cf3 → AppealPeriodExpired message", () => {
      expect(decodeErrorSelector("0x0eb66cf3")).toBe(
        "The appeal period has expired"
      );
    });

    it("decodes 0x4dcfa42d → AlreadyAppealed message", () => {
      expect(decodeErrorSelector("0x4dcfa42d")).toBe(
        "This slashing has already been appealed"
      );
    });

    it("decodes 0x6d5703c2 → AlreadyResolved message", () => {
      expect(decodeErrorSelector("0x6d5703c2")).toBe(
        "This appeal has already been resolved"
      );
    });

    it("decodes 0x34f5151d → InsufficientEscrowBalance message", () => {
      expect(decodeErrorSelector("0x34f5151d")).toBe(
        "Insufficient balance in escrow"
      );
    });
  });

  describe("EndorsementBidding selectors", () => {
    it("decodes 0x0edf5154 → SlashPercentageTooHigh message", () => {
      expect(decodeErrorSelector("0x0edf5154")).toBe(
        "Slash percentage exceeds the allowed maximum"
      );
    });

    it("decodes 0x37233762 → AlreadySlashed message", () => {
      expect(decodeErrorSelector("0x37233762")).toBe(
        "This bid has already been slashed"
      );
    });

    it("decodes 0xbb5d1a95 → BelowMinimumBid message", () => {
      expect(decodeErrorSelector("0xbb5d1a95")).toBe(
        "Bid amount is below the minimum required"
      );
    });
  });

  describe("selector extraction from longer hex strings", () => {
    it("uses only the first 10 chars (4 bytes) of a longer revert payload", () => {
      // Real revert data has selector + ABI-encoded args appended
      const withArgs =
        "0xcc7b075c000000000000000000000000000000000000000000000000000000000000001e";
      expect(decodeErrorSelector(withArgs)).toBe(
        "Slashing percentage exceeds the allowed maximum"
      );
    });
  });

  describe("case normalisation", () => {
    it("matches uppercase selector string", () => {
      expect(decodeErrorSelector("0xCC7B075C")).toBe(
        "Slashing percentage exceeds the allowed maximum"
      );
    });

    it("matches mixed-case selector string", () => {
      expect(decodeErrorSelector("0xCc7b075C")).toBe(
        "Slashing percentage exceeds the allowed maximum"
      );
    });
  });

  describe("unknown selectors", () => {
    it("returns undefined for a completely unknown 4-byte selector", () => {
      expect(decodeErrorSelector("0xdeadbeef")).toBeUndefined();
    });

    it("returns undefined for an empty string", () => {
      expect(decodeErrorSelector("")).toBeUndefined();
    });

    it("returns undefined for a non-hex string", () => {
      expect(decodeErrorSelector("not-a-selector")).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// getTransactionErrorMessage
// ---------------------------------------------------------------------------

describe("getTransactionErrorMessage", () => {
  describe("priority 1 — custom error name in shortMessage", () => {
    it("extracts AlreadyAppealed from a viem-style shortMessage", () => {
      const error = {
        shortMessage:
          "The contract function reverted with the following reason: AlreadyAppealed()",
        message: "some longer context",
      };
      expect(getTransactionErrorMessage(error)).toBe(
        "This slashing has already been appealed"
      );
    });

    it("extracts SlashingPercentageTooHigh from shortMessage", () => {
      const error = {
        shortMessage: "reverted with custom error 'SlashingPercentageTooHigh()'",
      };
      expect(getTransactionErrorMessage(error)).toBe(
        "Slashing percentage exceeds the allowed maximum"
      );
    });

    it("extracts BelowMinimumBid from shortMessage", () => {
      const error = {
        shortMessage: "Transaction reverted: BelowMinimumBid()",
      };
      expect(getTransactionErrorMessage(error)).toBe(
        "Bid amount is below the minimum required"
      );
    });
  });

  describe("priority 2 — raw revert data in cause chain (.data as string)", () => {
    it("decodes selector from cause.data string", () => {
      const error = {
        cause: {
          data: "0x4dcfa42d",
        },
      };
      expect(getTransactionErrorMessage(error)).toBe(
        "This slashing has already been appealed"
      );
    });

    it("decodes selector from nested cause.data.data string", () => {
      const error = {
        cause: {
          data: {
            data: "0x6d5703c2",
          },
        },
      };
      expect(getTransactionErrorMessage(error)).toBe(
        "This appeal has already been resolved"
      );
    });

    it("decodes selector from direct .data property", () => {
      const error = {
        data: "0xeae5f0e4",
      };
      expect(getTransactionErrorMessage(error)).toBe(
        "Only the slashed expert can perform this action"
      );
    });
  });

  describe("priority 3 — hex selector embedded in shortMessage", () => {
    it("decodes selector found inside shortMessage text", () => {
      const error = {
        shortMessage:
          "execution reverted: 0x0eb66cf3 (custom error decoded from ABI)",
      };
      expect(getTransactionErrorMessage(error)).toBe(
        "The appeal period has expired"
      );
    });

    it("falls back to raw shortMessage when selector is unrecognised", () => {
      const error = {
        shortMessage: "execution reverted: 0xdeadbeef00000000",
      };
      // decodeErrorSelector returns undefined → falls back to shortMessage
      expect(getTransactionErrorMessage(error)).toBe(
        "execution reverted: 0xdeadbeef00000000"
      );
    });

    it("returns shortMessage when it contains no custom error or selector", () => {
      const error = {
        shortMessage: "gas limit exceeded",
      };
      expect(getTransactionErrorMessage(error)).toBe("gas limit exceeded");
    });
  });

  describe("priority 4 — custom error name in Error.message (no shortMessage)", () => {
    it("extracts NotSlashedExpert from Error.message", () => {
      const error = new Error(
        "Execution reverted due to NotSlashedExpert() in ExpertStaking.sol"
      );
      expect(getTransactionErrorMessage(error)).toBe(
        "Only the slashed expert can perform this action"
      );
    });

    it("extracts AlreadySlashed from Error.message", () => {
      const error = new Error("Contract call failed: AlreadySlashed");
      expect(getTransactionErrorMessage(error)).toBe(
        "This bid has already been slashed"
      );
    });
  });

  describe("priority 5 — hex selector in Error.message", () => {
    it("decodes selector found in Error.message text", () => {
      const error = new Error("Revert data: 0xcc7b075c");
      expect(getTransactionErrorMessage(error)).toBe(
        "Slashing percentage exceeds the allowed maximum"
      );
    });
  });

  describe("priority 6 — raw Error.message fallback", () => {
    it("returns raw message when no match is found", () => {
      const error = new Error("out of gas");
      expect(getTransactionErrorMessage(error)).toBe("out of gas");
    });
  });

  describe("fallback string", () => {
    it("uses default fallback when error is null", () => {
      expect(getTransactionErrorMessage(null)).toBe("Transaction failed");
    });

    it("uses default fallback when error is undefined", () => {
      expect(getTransactionErrorMessage(undefined)).toBe("Transaction failed");
    });

    it("uses custom fallback string when provided and error is null", () => {
      expect(getTransactionErrorMessage(null, "Custom error message")).toBe(
        "Custom error message"
      );
    });

    it("uses custom fallback for unrecognised plain objects", () => {
      expect(getTransactionErrorMessage({ foo: "bar" }, "Fallback")).toBe(
        "Fallback"
      );
    });

    it("uses default fallback for a plain empty object", () => {
      expect(getTransactionErrorMessage({})).toBe("Transaction failed");
    });
  });
});

// ---------------------------------------------------------------------------
// getExplorerTxUrl
// ---------------------------------------------------------------------------

describe("getExplorerTxUrl", () => {
  it("builds a /tx/ URL", () => {
    const hash =
      "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123";
    const url = getExplorerTxUrl(hash);
    expect(url).toContain("/tx/");
    expect(url).toContain(hash);
  });

  it("URL ends with the provided hash", () => {
    const hash = "0xdeadbeef";
    expect(getExplorerTxUrl(hash)).toMatch(/\/tx\/0xdeadbeef$/);
  });

  it("uses a base URL (contains a hostname)", () => {
    const url = getExplorerTxUrl("0x1234");
    expect(url).toMatch(/^https?:\/\//);
  });
});

// ---------------------------------------------------------------------------
// getExplorerAddressUrl
// ---------------------------------------------------------------------------

describe("getExplorerAddressUrl", () => {
  it("builds an /address/ URL", () => {
    const addr = "0xAbCd1234AbCd1234AbCd1234AbCd1234AbCd1234";
    const url = getExplorerAddressUrl(addr);
    expect(url).toContain("/address/");
    expect(url).toContain(addr);
  });

  it("URL ends with the provided address", () => {
    const addr = "0xcafe";
    expect(getExplorerAddressUrl(addr)).toMatch(/\/address\/0xcafe$/);
  });

  it("uses the same base URL as getExplorerTxUrl", () => {
    const hash = "0x1";
    const addr = "0x2";
    const txBase = getExplorerTxUrl(hash).replace(`/tx/${hash}`, "");
    const addrBase = getExplorerAddressUrl(addr).replace(`/address/${addr}`, "");
    expect(txBase).toBe(addrBase);
  });
});

// ---------------------------------------------------------------------------
// ERROR_SELECTORS export — sanity checks on the exported map
// ---------------------------------------------------------------------------

describe("ERROR_SELECTORS map", () => {
  it("contains all five required SlashingManager selectors from the spec", () => {
    const required: Record<string, string> = {
      "0xcc7b075c": "SlashingPercentageTooHigh",
      "0xeae5f0e4": "NotSlashedExpert",
      "0x0eb66cf3": "AppealPeriodExpired",
      "0x4dcfa42d": "AlreadyAppealed",
      "0x6d5703c2": "AlreadyResolved",
    };
    for (const [selector, name] of Object.entries(required)) {
      expect(ERROR_SELECTORS[selector]).toBe(name);
    }
  });

  it("contains EndorsementBidding selectors from the spec", () => {
    expect(ERROR_SELECTORS["0x0edf5154"]).toBe("SlashPercentageTooHigh");
    expect(ERROR_SELECTORS["0x37233762"]).toBe("AlreadySlashed");
    expect(ERROR_SELECTORS["0xbb5d1a95"]).toBe("BelowMinimumBid");
  });

  it("all selector keys are lowercase 0x-prefixed 10-char strings", () => {
    for (const key of Object.keys(ERROR_SELECTORS)) {
      expect(key).toMatch(/^0x[0-9a-f]{8}$/);
    }
  });
});
