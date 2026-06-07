import { describe, it, expect } from "vitest";
import { EVAL_CASES } from "@/eval/cases";

describe("EVAL_CASES", () => {
  it("covers each fidelity risk category", () => {
    const cats = new Set(EVAL_CASES.map((c) => c.category));
    expect(cats).toContain("fabrication");
    expect(cats).toContain("sycophancy");
    expect(cats).toContain("modern-event");
    expect(cats).toContain("honesty");
  });
  it("every case has a prompt and a checker", () => {
    for (const c of EVAL_CASES) {
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(typeof c.check).toBe("function");
    }
  });
});
