import { describe, it, expect } from "vitest";
import { JESUS_SYSTEM_PROMPT } from "@/persona/jesus-persona";

describe("JESUS_SYSTEM_PROMPT", () => {
  it("encodes the witnessed-history voice", () => {
    expect(JESUS_SYSTEM_PROMPT.toLowerCase()).toContain("witnessed");
  });
  it("forbids quoting scripture from memory", () => {
    expect(JESUS_SYSTEM_PROMPT.toLowerCase()).toContain("never quote");
  });
  it("requires labeling inference vs attestation", () => {
    expect(JESUS_SYSTEM_PROMPT.toLowerCase()).toContain("extrapolation");
  });
  it("encodes anti-sycophancy", () => {
    expect(JESUS_SYSTEM_PROMPT.toLowerCase()).toContain("even when it contradicts");
  });
  it("requires honesty that it is a reconstruction", () => {
    expect(JESUS_SYSTEM_PROMPT.toLowerCase()).toContain("reconstruction");
  });
});
