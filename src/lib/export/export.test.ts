import { describe, it, expect } from "vitest";
import { buildScriptPdf } from "./pdf";
import { buildFountain } from "./fountain";
import { buildFdx } from "./fdx";
import { buildText } from "./txt";
import { buildDocx } from "./docx";
import { chatToMarkdown } from "./chat";
import { fountainToElements, paginate, makeElement } from "../fountain";
import { emptyMetadata } from "../muxw";

const NO_TITLE = { titlePage: false };
const WITH_TITLE = { titlePage: true };

describe("buildScriptPdf", () => {
  it("produces a valid, non trivial PDF", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    const elements = fountainToElements(
      "INT. KITCHEN - NIGHT\n\nMaya pours coffee.\n\nMAYA\nOne good scene.\n",
    );
    const bytes = buildScriptPdf(elements, meta, NO_TITLE);
    // PDF files begin with the "%PDF" magic header.
    const header = new TextDecoder().decode(bytes.slice(0, 4));
    expect(header).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(800);
  });

  it("adds a title page when requested", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    const elements = fountainToElements("INT. KITCHEN - NIGHT\n\nAction.\n");
    const withTitle = buildScriptPdf(elements, meta, WITH_TITLE);
    const without = buildScriptPdf(elements, meta, NO_TITLE);
    const count = (b: Uint8Array) =>
      (new TextDecoder("latin1").decode(b).match(/\/Type\s*\/Page[^s]/g) ?? [])
        .length;
    expect(count(withTitle)).toBe(count(without) + 1);
  });

  it("renders dual dialogue without error", () => {
    const elements = [
      makeElement("scene_heading", "INT. ALLEY - NIGHT"),
      makeElement("character", "BRICK"),
      makeElement("dialogue", "Screw retirement."),
      { ...makeElement("character", "STEEL"), dual: true },
      makeElement("dialogue", "Screw retirement."),
    ];
    const bytes = buildScriptPdf(elements, emptyMetadata(), NO_TITLE);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
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

    const bytes = buildScriptPdf(elements, emptyMetadata(), NO_TITLE);
    const text = new TextDecoder("latin1").decode(bytes);
    // Count page objects ("/Type /Page" but not "/Type /Pages").
    const pdfPages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pdfPages).toBe(expectedPages);
  });
});

const SCRIPT = "INT. KITCHEN - NIGHT\n\nMaya pours coffee.\n\nMAYA\nOne good scene.\n";

describe("buildFountain", () => {
  it("round trips the body and adds front matter for a title page", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    meta.author = "A. Writer";
    const out = buildFountain(fountainToElements(SCRIPT), meta, WITH_TITLE);
    expect(out).toContain("Title: Cold Coffee");
    expect(out).toContain("Author: A. Writer");
    expect(out).toContain("INT. KITCHEN - NIGHT");
  });

  it("omits front matter without a title page", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    const out = buildFountain(fountainToElements(SCRIPT), meta, NO_TITLE);
    expect(out).not.toContain("Title:");
  });
});

describe("buildFdx", () => {
  it("emits typed paragraphs and escapes XML", () => {
    const elements = fountainToElements("INT. A & B - DAY\n\nHe said <go>.\n");
    const out = buildFdx(elements, emptyMetadata(), NO_TITLE);
    expect(out).toContain('<FinalDraft DocumentType="Script"');
    expect(out).toContain('<Paragraph Type="Scene Heading">');
    expect(out).toContain("A &amp; B");
    expect(out).toContain("&lt;go&gt;");
  });

  it("wraps dual dialogue in a DualDialogue element", () => {
    const elements = [
      makeElement("character", "BRICK"),
      makeElement("dialogue", "Screw retirement."),
      { ...makeElement("character", "STEEL"), dual: true },
      makeElement("dialogue", "Screw retirement."),
    ];
    const out = buildFdx(elements, emptyMetadata(), NO_TITLE);
    expect(out).toContain("<DualDialogue>");
    expect(out).toContain("</DualDialogue>");
    // Both speakers live inside, and there is no stray separator character.
    expect(out).toContain("BRICK");
    expect(out).toContain("STEEL");
    expect(out).not.toContain("STEEL ^");
  });
});

describe("buildText", () => {
  it("indents dialogue and characters", () => {
    const out = buildText(fountainToElements(SCRIPT), emptyMetadata(), NO_TITLE);
    expect(out).toContain("INT. KITCHEN - NIGHT");
    expect(out).toMatch(/\n {20}MAYA/); // character indented
  });
});

describe("buildDocx", () => {
  it("produces a docx (zip) file", async () => {
    const bytes = await buildDocx(fountainToElements(SCRIPT), emptyMetadata(), NO_TITLE);
    // DOCX is a zip; zip files start with PK\x03\x04.
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("builds a docx with dual dialogue (a two column table) without error", async () => {
    const elements = [
      makeElement("scene_heading", "INT. ALLEY - NIGHT"),
      makeElement("character", "BRICK"),
      makeElement("dialogue", "Screw retirement."),
      { ...makeElement("character", "STEEL"), dual: true },
      makeElement("dialogue", "Screw retirement."),
    ];
    const bytes = await buildDocx(elements, emptyMetadata(), NO_TITLE);
    expect(bytes[0]).toBe(0x50);
    expect(bytes.length).toBeGreaterThan(500);
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
