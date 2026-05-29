import { describe, expect, it } from "vitest";

import { relativeTime } from "./time";

describe("relativeTime", () => {
  const now = new Date("2026-05-29T12:00:00Z").getTime();

  it("renders recent times as 'just now'", () => {
    expect(relativeTime("2026-05-29T11:59:40Z", now)).toBe("just now");
  });

  it("renders minutes, hours and days", () => {
    expect(relativeTime("2026-05-29T11:30:00Z", now)).toBe("30m ago");
    expect(relativeTime("2026-05-29T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-05-27T12:00:00Z", now)).toBe("2d ago");
  });

  it("returns empty string for invalid input", () => {
    expect(relativeTime("not-a-date", now)).toBe("");
  });
});
