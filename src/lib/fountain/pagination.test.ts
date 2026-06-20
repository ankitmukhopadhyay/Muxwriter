import { describe, it, expect } from "vitest";
import { paginate } from "./pagination";
import { availableTypes, cycleType, makeElement } from "./types";
import { fountainToElements } from "./parse";

describe("paginate", () => {
  it("keeps a short script on a single page", () => {
    const elements = fountainToElements(
      "INT. KITCHEN - NIGHT\n\nMaya pours coffee.\n",
    );
    expect(paginate(elements)).toHaveLength(1);
  });

  it("flows a long script across multiple pages without losing elements", () => {
    const elements = Array.from({ length: 80 }, (_, i) =>
      makeElement("action", `Action line number ${i + 1} keeps going here.`),
    );
    const pages = paginate(elements);
    expect(pages.length).toBeGreaterThan(1);
    // No element is dropped or duplicated, and order is preserved.
    const flat = pages.flat();
    expect(flat).toHaveLength(elements.length);
    expect(flat.map((e) => e.id)).toEqual(elements.map((e) => e.id));
  });

  it("always returns at least one page, even when empty", () => {
    expect(paginate([])).toHaveLength(1);
  });
});

describe("context aware tab", () => {
  it("offers no dialogue or parenthetical when no character has spoken", () => {
    const types = availableTypes(null);
    expect(types).not.toContain("dialogue");
    expect(types).not.toContain("parenthetical");
    expect(types).toContain("action");
    expect(types).toContain("character");
  });

  it("offers dialogue and parenthetical inside a dialogue block", () => {
    const types = availableTypes("character");
    expect(types).toContain("dialogue");
    expect(types).toContain("parenthetical");
  });

  it("Tab from dialogue after a character cue lands on parenthetical", () => {
    expect(cycleType("dialogue", "character")).toBe("parenthetical");
  });

  it("Tab on a fresh line cycles through action, character, scene, transition", () => {
    expect(cycleType("action", null)).toBe("character");
    expect(cycleType("character", null)).toBe("scene_heading");
    expect(cycleType("transition", null)).toBe("action");
  });

  it("snaps an out of context type to the first sensible type", () => {
    // A dialogue line with no preceding character is invalid; Tab snaps it.
    expect(cycleType("dialogue", null)).toBe("action");
  });
});
