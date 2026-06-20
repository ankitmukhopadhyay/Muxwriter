import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./context";
import { fountainToElements } from "../fountain";
import { emptyMetadata } from "../muxw";

describe("buildSystemPrompt", () => {
  const elements = fountainToElements(
    [
      "INT. KITCHEN - NIGHT",
      "",
      "Maya pours coffee.",
      "",
      "EXT. ROOFTOP - DAY",
      "",
      "The city exhales.",
    ].join("\n"),
  );

  it("includes the current scene in full detail", () => {
    const rooftop = elements.find((e) => e.text.includes("ROOFTOP"))!;
    const prompt = buildSystemPrompt(emptyMetadata(), elements, rooftop.id);
    expect(prompt).toContain("Current scene");
    expect(prompt).toContain("EXT. ROOFTOP - DAY");
    expect(prompt).toContain("The city exhales.");
  });

  it("folds the story bible into context when present", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    meta.storyBible.logline = "A writer fights a cursor.";
    meta.storyBible.characters.push({ name: "MAYA", description: "Stubborn." });
    const prompt = buildSystemPrompt(meta, elements, null);
    expect(prompt).toContain("Cold Coffee");
    expect(prompt).toContain("fights a cursor");
    expect(prompt).toContain("MAYA: Stubborn.");
  });

  it("notes an empty bible and empty scene log gracefully", () => {
    const prompt = buildSystemPrompt(emptyMetadata(), elements, null);
    expect(prompt).toContain("story bible is empty");
    expect(prompt).toContain("No earlier scenes have been summarized");
  });
});
