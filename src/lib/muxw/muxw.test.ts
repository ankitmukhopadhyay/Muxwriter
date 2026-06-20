import { describe, it, expect } from "vitest";
import { serializeMuxw, parseMuxw } from "./format";
import { emptyMetadata } from "./schema";
import { fountainToElements } from "../fountain";

describe("muxw format", () => {
  it("round trips metadata and script", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    meta.author = "M. Writer";
    meta.storyBible.logline = "A writer fights a blinking cursor.";
    meta.storyBible.characters.push({
      name: "MAYA",
      description: "30s, stubborn.",
    });
    meta.notes.global = "Keep it tight.";

    const elements = fountainToElements(
      "INT. GARRET - NIGHT\n\nMAYA\nOne good scene.\n",
    );

    const text = serializeMuxw(meta, elements);
    const parsed = parseMuxw(text);

    expect(parsed.metadata.title).toBe("Cold Coffee");
    expect(parsed.metadata.author).toBe("M. Writer");
    expect(parsed.metadata.storyBible.logline).toContain("blinking cursor");
    expect(parsed.metadata.storyBible.characters[0].name).toBe("MAYA");
    expect(parsed.metadata.notes.global).toBe("Keep it tight.");
    expect(parsed.elements.map((e) => e.type)).toEqual([
      "scene_heading",
      "character",
      "dialogue",
    ]);
  });

  it("imports a plain Fountain file as a body with empty metadata", () => {
    const parsed = parseMuxw("INT. KITCHEN - DAY\n\nAction here.\n");
    expect(parsed.metadata.title).toBe("");
    expect(parsed.elements[0].type).toBe("scene_heading");
  });

  it("falls back to empty metadata on malformed JSON", () => {
    const text = "%%MUXW%%\n{ not valid json \n%%MUXW%%\n\nAction.\n";
    const parsed = parseMuxw(text);
    expect(parsed.metadata.version).toBeGreaterThan(0);
    expect(parsed.elements[0].type).toBe("action");
  });

  it("produces human readable, diffable output", () => {
    const text = serializeMuxw(emptyMetadata(), fountainToElements("Action."));
    expect(text.startsWith("%%MUXW%%")).toBe(true);
    // Pretty printed JSON: indented keys on their own lines.
    expect(text).toContain('\n  "title": ""');
  });
});
