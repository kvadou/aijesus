import { describe, it, expect, vi } from "vitest";
import { runAgent } from "@/chat/agent";
import * as tools from "@/chat/tools";

function makeFakeAnthropic(responses: any[]) {
  let call = 0;
  return { messages: { create: vi.fn(async () => responses[call++]) } } as any;
}

describe("runAgent", () => {
  it("executes a requested tool then returns the model's final answer", async () => {
    vi.spyOn(tools, "dispatchTool").mockResolvedValue("[John 10:11 — web, tier 1] I am the good shepherd");
    const anthropic = makeFakeAnthropic([
      {
        stop_reason: "tool_use",
        content: [
          { type: "text", text: "Let me look." },
          { type: "tool_use", id: "t1", name: "search_corpus", input: { query: "good shepherd" } },
        ],
      },
      {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "I am the good shepherd (John 10:11). I lay down my life for the sheep." }],
      },
    ]);
    const result = await runAgent(anthropic, {} as any, [{ role: "user", content: "who is the good shepherd?" }]);
    expect(result.text).toContain("good shepherd");
    expect(result.citations[0].reference).toBe("John 10:11");
    expect(anthropic.messages.create).toHaveBeenCalledTimes(2);
  });
});
