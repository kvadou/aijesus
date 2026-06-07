import { describe, it, expect, vi, beforeEach } from "vitest";
import { embed } from "@/corpus/embed";

beforeEach(() => {
  vi.stubEnv("VOYAGE_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }] }), { status: 200 })
  ));
});

describe("embed", () => {
  it("returns one vector per input, in order", async () => {
    const vecs = await embed(["alpha", "beta"], "document");
    expect(vecs).toHaveLength(2);
    expect(vecs[1]).toEqual([0.3, 0.4]);
  });
  it("sends model voyage-3-large and the input_type", async () => {
    await embed(["x"], "query");
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.model).toBe("voyage-3-large");
    expect(body.input_type).toBe("query");
  });
});
