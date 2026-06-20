import { describe, it, expect } from "vitest";
import { buildScriptPdf } from "./pdf";
import { chatToMarkdown } from "./chat";
import { fountainToElements, paginate, makeElement } from "../fountain";
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

  it("renders one PDF page per editor page so the export matches the screen", () => {
    const elements = [];
    for (let i = 0; i < 50; i++) {
      elements.push(makeElement("scene_heading", `INT. ROOM ${i} - DAY`));
      elements.push(makeElement("action", `Action ${i} fills out the page.`));
      elements.push(makeElement("character", `PERSON ${i}`));
      elements.push(makeElement("dialogue", `Dialogue line ${i} keeps going.`));
    }
    const expectedPages = paginate(elements).length;
    expect(expectedPages).toBeGreaterThan(1);

    const bytes = buildScriptPdf(elements, emptyMetadata());
    const text = new TextDecoder("latin1").decode(bytes);
    // Count page objects ("/Type /Page" but not "/Type /Pages").
    const pdfPages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pdfPages).toBe(expectedPages);
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
