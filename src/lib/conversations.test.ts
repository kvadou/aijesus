import { describe, it, expect, vi } from "vitest";
import { autoTitle, appendMessage } from "@/lib/conversations";

describe("autoTitle", () => {
  it("uses the first ~60 chars of the first user message", () => {
    expect(autoTitle("Who is the good shepherd and what did he teach about the lost sheep parable?"))
      .toBe("Who is the good shepherd and what did he teach about the lost…");
  });
  it("returns the whole string when short", () => {
    expect(autoTitle("Hello")).toBe("Hello");
  });
});

describe("appendMessage", () => {
  it("inserts a row mapped to the conversation with citations", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ insert })) } as any;
    await appendMessage(client, "conv-1", "assistant", "I am the good shepherd", [
      { reference: "John 10:11", sourceId: "web", tier: 1, text: "I am the good shepherd" },
    ]);
    expect(client.from).toHaveBeenCalledWith("messages");
    const row = insert.mock.calls[0][0];
    expect(row.conversation_id).toBe("conv-1");
    expect(row.role).toBe("assistant");
    expect(row.citations[0].reference).toBe("John 10:11");
  });
});
