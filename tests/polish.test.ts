import { describe, expect, it } from "vitest";
import { AUTH_TIMEOUT_MS, MIN_PASSWORD_LENGTH, friendlyAuthError } from "@/lib/auth-client";
import { DEFAULT_MARKET, MARKETS, marketForCurrency, parseMarket } from "@/lib/market";

describe("auth messages", () => {
  it("explains the common failures in plain words", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe("That email and password don't match.");
    expect(friendlyAuthError("User already registered")).toMatch(/already exists/);
    expect(friendlyAuthError("Request rate limit reached")).toMatch(/Too many attempts/);
    expect(friendlyAuthError("email rate limit exceeded")).toMatch(/Too many attempts/);
    expect(friendlyAuthError("over_request_rate_limit")).toMatch(/Too many attempts/);
  });
  it("asks for at least 10 characters and gives up after 15 seconds", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(friendlyAuthError("Password should be at least 6 characters")).toMatch(/at least 10 characters/);
    expect(AUTH_TIMEOUT_MS).toBe(15_000);
  });
});

describe("markets", () => {
  it("defaults to Oslo/NOK and maps currency to market", () => {
    expect(DEFAULT_MARKET).toBe("oslo");
    expect(parseMarket(undefined)).toBe("oslo");
    expect(parseMarket("nonsense")).toBe("oslo");
    expect(parseMarket("mallorca")).toBe("mallorca");
    expect(MARKETS.oslo.currency).toBe("NOK");
    expect(MARKETS.mallorca.currency).toBe("EUR");
    expect(marketForCurrency("EUR")).toBe("mallorca");
    expect(marketForCurrency("NOK")).toBe("oslo");
  });
});
