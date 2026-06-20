import { describe, it, expect } from "vitest";
import { pageToLines, linesToFountain } from "./reconstruct";
import { fountainToElements } from "../fountain";

// Helper: a PDF text item at (x, y) with the given string.
const item = (str: string, x: number, y: number) => ({
  str,
  transform: [1, 0, 0, 1, x, y],
});

describe("pageToLines", () => {
  it("groups items on the same baseline into one line, ordered by x", () => {
    const lines = pageToLines([
      item("WORLD", 200, 700),
      item("HELLO ", 108, 700),
      item("Next line.", 108, 686),
    ]);
    expect(lines.map((l) => l.text)).toEqual(["HELLO WORLD", "Next line."]);
  });
});

describe("linesToFountain + parser", () => {
  it("reconstructs a screenplay from positioned lines (gaps become blanks)", () => {
    // Single line spacing 14pt; element spacing 28pt. Action and dialogue have
    // wrapped lines so the line gap (14) is the most common.
    const lines = pageToLines([
      item("INT. ROOM - DAY", 108, 700),
      item("She enters the room and looks", 108, 672), // gap 28: new element
      item("around at everything slowly.", 108, 658), // gap 14: same paragraph
      item("MAYA", 266, 630), // gap 28: new element
      item("Hello there. How are you", 180, 616), // gap 14: dialogue
      item("doing today, my old friend?", 180, 602), // gap 14: dialogue
      item("She turns and leaves quietly.", 108, 574), // gap 28: new element
    ]);

    const fountain = linesToFountain(lines);
    const elements = fountainToElements(fountain);
    const shape = elements.map((e) => e.type);
    expect(shape).toEqual([
      "scene_heading",
      "action",
      "character",
      "dialogue",
      "action",
    ]);
    expect(elements[2].text).toBe("MAYA");
    expect(elements[3].text).toContain("Hello there");
  });

  it("returns empty for no lines", () => {
    expect(linesToFountain([])).toBe("");
  });
});
