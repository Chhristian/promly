import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/promoter")).toBe("/promoter");
    expect(safeNextPath("/business/campaigns/abc?tab=1#x")).toBe("/business/campaigns/abc?tab=1#x");
  });

  it("falls back for anything that could leave the site", () => {
    for (const bad of [
      "https://evil.com",
      "http://evil.com/promoter",
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "/\\/evil.com",
      "javascript:alert(1)",
      "evil.com",
      "/%0a//evil.com\n",
      " /promoter",
    ]) {
      expect(safeNextPath(bad), bad).toBe("/");
    }
  });

  it("uses the fallback when next is missing", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined, "/onboarding")).toBe("/onboarding");
  });
});
