import { describe, it, expect } from "vitest";
import { readLocal, writeLocal, clearLocal, type LocalConversation } from "@/lib/local-history";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

describe("local-history", () => {
  it("round-trips conversations", () => {
    const s = fakeStorage();
    const convs: LocalConversation[] = [
      { id: "local-1", title: "Hi", messages: [{ role: "user", content: "Hi", citations: [] }] },
    ];
    writeLocal(s, convs);
    expect(readLocal(s)).toEqual(convs);
  });
  it("returns [] when empty or corrupt", () => {
    const s = fakeStorage();
    expect(readLocal(s)).toEqual([]);
    s.setItem("aijesus.history", "not json");
    expect(readLocal(s)).toEqual([]);
  });
  it("clears", () => {
    const s = fakeStorage();
    writeLocal(s, [{ id: "x", title: "t", messages: [] }]);
    clearLocal(s);
    expect(readLocal(s)).toEqual([]);
  });
});
