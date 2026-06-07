import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/chat/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit, then blocks with a positive retryAfter", () => {
    const ip = "1.2.3.4";
    const t0 = 1000;
    for (let i = 0; i < 8; i++) {
      expect(checkRateLimit(ip, t0 + i).ok).toBe(true);
    }
    const blocked = checkRateLimit(ip, t0 + 8);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("frees the bucket after the window elapses", () => {
    const ip = "5.6.7.8";
    const t0 = 1000;
    for (let i = 0; i < 8; i++) checkRateLimit(ip, t0 + i);
    expect(checkRateLimit(ip, t0 + 8).ok).toBe(false);
    expect(checkRateLimit(ip, t0 + 30001).ok).toBe(true);
  });

  it("tracks separate IPs independently", () => {
    const t0 = 5000;
    for (let i = 0; i < 8; i++) checkRateLimit("9.9.9.9", t0 + i);
    expect(checkRateLimit("9.9.9.9", t0 + 8).ok).toBe(false);
    expect(checkRateLimit("10.10.10.10", t0 + 8).ok).toBe(true);
  });
});
