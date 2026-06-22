import { describe, it, expect } from "vitest";
import { fountainToElements } from "./parse";
import { elementsToFountain } from "./serialize";
import { deriveScenes } from "./scenes";
import type { ScriptElement } from "./types";
import { makeElement } from "./types";

describe("dual dialogue", () => {
  it("round trips the dual flag through Fountain", () => {
    const elements: ScriptElement[] = [
      makeElement("character", "BRICK"),
      makeElement("dialogue", "Screw retirement."),
      { ...makeElement("character", "STEEL"), dual: true },
      makeElement("dialogue", "Screw retirement."),
    ];
    const fountain = elementsToFountain(elements);
    expect(fountain).toContain("STEEL ^");

    const parsed = fountainToElements(fountain);
    const characters = parsed.filter((e) => e.type === "character");
    expect(characters[0].dual).toBeFalsy();
    expect(characters[1].dual).toBe(true);
    expect(characters[1].text).toBe("STEEL");
  });
});

describe("fountainToElements", () => {
  it("parses the core element types", () => {
    const source = [
      "INT. KITCHEN - NIGHT",
      "",
      "Maya pours coffee.",
      "",
      "MAYA",
      "(quietly)",
      "One good scene.",
      "",
      "CUT TO:",
    ].join("\n");

    const els = fountainToElements(source);
    const shape = els.map((e) => e.type);
    expect(shape).toEqual([
      "scene_heading",
      "action",
      "character",
      "parenthetical",
      "dialogue",
      "transition",
    ]);
    expect(els[0].text).toBe("INT. KITCHEN - NIGHT");
    expect(els[3].text).toContain("quietly");
  });

  it("returns a single empty scene heading for empty input", () => {
    const els = fountainToElements("   ");
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("scene_heading");
    expect(els[0].text).toBe("");
  });

  it("assigns unique ids", () => {
    const els = fountainToElements("Action one.\n\nAction two.");
    const ids = new Set(els.map((e) => e.id));
    expect(ids.size).toBe(els.length);
  });
});

describe("elementsToFountain", () => {
  it("keeps a dialogue block contiguous and separates other elements", () => {
    const els: ScriptElement[] = [
      makeElement("scene_heading", "int. kitchen - night"),
      makeElement("action", "Maya pours coffee."),
      makeElement("character", "maya"),
      makeElement("parenthetical", "quietly"),
      makeElement("dialogue", "One good scene."),
    ];
    const text = elementsToFountain(els);
    expect(text).toContain("INT. KITCHEN - NIGHT");
    expect(text).toContain("(quietly)");
    // Character, parenthetical, dialogue stay contiguous (no blank between).
    expect(text).toContain("MAYA\n(quietly)\nOne good scene.");
    // A blank line precedes the character cue.
    expect(text).toContain("Maya pours coffee.\n\nMAYA");
  });
});

describe("round trip", () => {
  it("parse then serialize then parse yields the same element shape", () => {
    const source = [
      "INT. KITCHEN - NIGHT",
      "",
      "Maya pours coffee.",
      "",
      "MAYA",
      "(quietly)",
      "One good scene.",
      "",
      "EXT. ROOFTOP - DAY",
      "",
      "The city exhales.",
    ].join("\n");

    const first = fountainToElements(source);
    const second = fountainToElements(elementsToFountain(first));
    expect(second.map((e) => e.type)).toEqual(first.map((e) => e.type));
    expect(second.map((e) => e.text)).toEqual(first.map((e) => e.text));
  });
});

describe("transition round trip", () => {
  it("keeps transitions as transitions when reopened, even unusual ones", () => {
    const els: ScriptElement[] = [
      makeElement("scene_heading", "INT. ROOM - DAY"),
      makeElement("action", "She leaves."),
      makeElement("transition", "CUT TO:"),
      makeElement("transition", "SMASH CUT:"),
      makeElement("transition", "DISSOLVE:"),
    ];
    const reparsed = fountainToElements(elementsToFountain(els));
    const transitions = reparsed.filter((e) => e.type === "transition");
    expect(transitions).toHaveLength(3);
    expect(transitions.map((t) => t.text)).toEqual([
      "CUT TO:",
      "SMASH CUT:",
      "DISSOLVE:",
    ]);
  });
});

describe("round trip audit (common screenplay elements)", () => {
  it("preserves every core element type and character extensions", () => {
    const els: ScriptElement[] = [
      makeElement("scene_heading", "INT. KITCHEN - NIGHT"),
      makeElement("action", "Maya pours coffee."),
      makeElement("character", "MAYA (V.O.)"),
      makeElement("parenthetical", "(quietly)"),
      makeElement("dialogue", "One good scene."),
      makeElement("transition", "SMASH CUT:"),
      makeElement("scene_heading", "EXT. ROOFTOP - DAY"),
      makeElement("action", "Wind."),
      makeElement("character", "SAM (O.S.)"),
      makeElement("dialogue", "Maya?"),
      makeElement("transition", "FADE OUT."),
    ];
    const back = fountainToElements(elementsToFountain(els));
    expect(back.map((e) => e.type)).toEqual(els.map((e) => e.type));
    expect(back.map((e) => e.text)).toEqual(els.map((e) => e.text));
  });
});

describe("deriveScenes", () => {
  it("splits into scenes and parses headings", () => {
    const els = fountainToElements(
      [
        "INT. KITCHEN - NIGHT",
        "",
        "MAYA",
        "Hi.",
        "",
        "EXT. ROOFTOP - DAY",
        "",
        "Wind.",
      ].join("\n"),
    );
    const scenes = deriveScenes(els);
    expect(scenes).toHaveLength(2);
    expect(scenes[0].environment).toBe("INT");
    expect(scenes[0].location).toBe("KITCHEN");
    expect(scenes[0].timeOfDay).toBe("NIGHT");
    expect(scenes[0].characters).toEqual(["MAYA"]);
    expect(scenes[1].environment).toBe("EXT");
    expect(scenes[1].index).toBe(2);
  });
});
