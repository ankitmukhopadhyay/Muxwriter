import { describe, it, expect } from "vitest";
import { getSuggestions, looksLikeSceneHeading } from "./smarttype";
import { fountainToElements } from "./parse";

const elements = fountainToElements(
  [
    "INT. KITCHEN - NIGHT",
    "",
    "MAYA",
    "Hi.",
    "",
    "SAM",
    "Hey.",
  ].join("\n"),
);

describe("getSuggestions", () => {
  it("suggests scene intros from an initial letter", () => {
    expect(getSuggestions("scene_heading", "I", elements)).toContain("INT. ");
    expect(getSuggestions("scene_heading", "E", elements)).toContain("EXT. ");
  });

  it("reuses existing locations for scene headings", () => {
    expect(getSuggestions("scene_heading", "INT. KIT", elements)).toContain(
      "INT. KITCHEN - NIGHT",
    );
  });

  it("completes the time of day after the dash", () => {
    const out = getSuggestions("scene_heading", "EXT. ROOF - N", elements);
    expect(out).toContain("EXT. ROOF - NIGHT");
  });

  it("autocompletes character names from the cast", () => {
    expect(getSuggestions("character", "M", elements)).toEqual(["MAYA"]);
    expect(getSuggestions("character", "", elements)).toEqual(["MAYA", "SAM"]);
  });

  it("suggests standard transitions", () => {
    expect(getSuggestions("transition", "DIS", elements)).toContain(
      "DISSOLVE TO:",
    );
  });

  it("offers nothing for action lines", () => {
    expect(getSuggestions("action", "She runs", elements)).toEqual([]);
  });
});

describe("looksLikeSceneHeading", () => {
  it("detects scene heading prefixes in an action line", () => {
    expect(looksLikeSceneHeading("INT. KITCHEN")).toBe(true);
    expect(looksLikeSceneHeading("ext. rooftop - day")).toBe(true);
    expect(looksLikeSceneHeading("Internal monologue here")).toBe(false);
    expect(looksLikeSceneHeading("She enters.")).toBe(false);
  });
});
