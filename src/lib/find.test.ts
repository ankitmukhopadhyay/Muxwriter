import { describe, expect, it } from "vitest";
import { findMatches, replaceAll, replaceMatch } from "./find";
import { makeElement } from "./fountain";

function els() {
  return [
    makeElement("scene_heading", "INT. DINER - NIGHT"),
    makeElement("action", "Maya enters the diner. The diner is loud."),
    makeElement("character", "MAYA"),
  ];
}

describe("findMatches", () => {
  it("finds all case insensitive occurrences in document order", () => {
    const matches = findMatches(els(), "diner", false);
    expect(matches).toHaveLength(3);
    // First in the heading, then two in the action line.
    expect(matches[0].elementId).toBe(matches[0].elementId);
    expect(matches[1].start).toBeLessThan(matches[2].start);
  });

  it("respects match case", () => {
    expect(findMatches(els(), "DINER", true)).toHaveLength(1);
    expect(findMatches(els(), "diner", true)).toHaveLength(2);
  });

  it("returns nothing for an empty query", () => {
    expect(findMatches(els(), "", false)).toHaveLength(0);
  });
});

describe("replaceMatch", () => {
  it("replaces a single occurrence at the given range", () => {
    const list = els();
    const m = findMatches(list, "Maya", true)[0];
    const next = replaceMatch(list, m, "Jonas");
    expect(next[1].text).toBe("Jonas enters the diner. The diner is loud.");
  });
});

describe("replaceAll", () => {
  it("replaces every occurrence and counts them", () => {
    const { elements, count } = replaceAll(els(), "diner", "cafe", false);
    expect(count).toBe(3);
    expect(elements[0].text).toBe("INT. cafe - NIGHT");
    expect(elements[1].text).toBe("Maya enters the cafe. The cafe is loud.");
  });

  it("does not rescan replacement text", () => {
    const list = [makeElement("action", "aaa")];
    const { count } = replaceAll(list, "a", "aa", false);
    expect(count).toBe(3);
  });
});
