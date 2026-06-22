import { describe, expect, it } from "vitest";
import { deriveTitle, newChatSession } from "./chats";

describe("deriveTitle", () => {
  it("uses the first user message, collapsed and trimmed", () => {
    expect(
      deriveTitle([
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "  How do I   open\non a rooftop?  " },
      ]),
    ).toBe("How do I open on a rooftop?");
  });

  it("truncates long titles with an ellipsis", () => {
    const long = "a".repeat(80);
    const title = deriveTitle([{ role: "user", content: long }]);
    expect(title.length).toBeLessThanOrEqual(48);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back when there is no user message", () => {
    expect(deriveTitle([])).toBe("New chat");
    expect(deriveTitle([{ role: "assistant", content: "hello" }])).toBe(
      "New chat",
    );
  });
});

describe("newChatSession", () => {
  it("creates empty sessions with unique ids", () => {
    const a = newChatSession();
    const b = newChatSession();
    expect(a.messages).toHaveLength(0);
    expect(a.id).not.toBe(b.id);
  });
});
