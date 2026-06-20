import { describe, it, expect } from "vitest";
import { buildScriptPdf } from "./pdf";
import { chatToMarkdown } from "./chat";
import { fountainToElements } from "../fountain";
import { emptyMetadata } from "../muxw";

describe("buildScriptPdf", () => {
  it("produces a valid, non trivial PDF", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    const elements = fountainToElements(
      "INT. KITCHEN - NIGHT\n\nMaya pours coffee.\n\nMAYA\nOne good scene.\n",
    );
    const bytes = buildScriptPdf(elements, meta);
    // PDF files begin with the "%PDF" magic header.
    const header = new TextDecoder().decode(bytes.slice(0, 4));
    expect(header).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(800);
  });
});

describe("chatToMarkdown", () => {
  it("renders a branded transcript with roles", () => {
    const md = chatToMarkdown(
      [
        { role: "user", content: "How is the pacing?" },
        { role: "assistant", content: "Tighten Scene 2." },
      ],
      emptyMetadata(),
    );
    expect(md).toContain("# Muxwriter brainstorm transcript");
    expect(md).toContain("### You");
    expect(md).toContain("How is the pacing?");
    expect(md).toContain("### Partner");
    expect(md).toContain("Tighten Scene 2.");
  });
});
