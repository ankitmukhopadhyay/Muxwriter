import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./context";
import { fountainToElements } from "../fountain";
import { emptyMetadata } from "../muxw";

const SCRIPT = [
  "INT. DINER - NIGHT",
  "",
  "Maya stares at a blinking cursor.",
  "",
  "MAYA",
  "One good scene.",
  "",
  "EXT. ROOFTOP - DAY",
  "",
  "The city exhales below.",
].join("\n");

describe("buildSystemPrompt", () => {
  it("includes the full script, every scene, not just the current one", () => {
    const elements = fountainToElements(SCRIPT);
    const prompt = buildSystemPrompt(emptyMetadata(), elements, null);
    expect(prompt).toContain("DINER");
    expect(prompt).toContain("ROOFTOP");
    expect(prompt).toContain("Scene 1");
    expect(prompt).toContain("Scene 2");
    expect(prompt).toContain("full current script");
  });

  it("tells the model never to claim it cannot see the script", () => {
    const prompt = buildSystemPrompt(emptyMetadata(), fountainToElements(SCRIPT), null);
    expect(prompt.toLowerCase()).toContain("never say you cannot see");
  });

  it("instructs script changes to go through tools, not chat", () => {
    const prompt = buildSystemPrompt(emptyMetadata(), fountainToElements(SCRIPT), null);
    expect(prompt).toContain("propose_edit");
    expect(prompt).toContain("write_script");
    expect(prompt.toLowerCase()).toContain("discussion only");
  });

  it("folds the story bible into context when present", () => {
    const meta = emptyMetadata();
    meta.title = "Cold Coffee";
    meta.storyBible.logline = "A writer fights a cursor.";
    meta.storyBible.characters.push({ name: "MAYA", description: "Stubborn." });
    const prompt = buildSystemPrompt(meta, fountainToElements(SCRIPT), null);
    expect(prompt).toContain("Cold Coffee");
    expect(prompt).toContain("fights a cursor");
    expect(prompt).toContain("MAYA: Stubborn.");
  });

  it("surfaces saved notes so the partner can build on them", () => {
    const meta = emptyMetadata();
    meta.notes.global = "The ending needs more weight.";
    const prompt = buildSystemPrompt(meta, fountainToElements(SCRIPT), null);
    expect(prompt).toContain("The ending needs more weight.");
  });

  it("handles an empty script without pretending there is one", () => {
    const prompt = buildSystemPrompt(emptyMetadata(), fountainToElements(""), null);
    expect(prompt.toLowerCase()).toContain("script is empty");
  });

  it("teaches the exact dual dialogue syntax and forbids separators", () => {
    const prompt = buildSystemPrompt(emptyMetadata(), fountainToElements(SCRIPT), null);
    // The caret on the second cue is the only correct marker.
    expect(prompt).toContain("STEEL ^");
    expect(prompt.toLowerCase()).toContain("use a slash, backslash");
  });

  it("forbids editorial markers inside the script", () => {
    const prompt = buildSystemPrompt(emptyMetadata(), fountainToElements(SCRIPT), null);
    expect(prompt.toLowerCase()).toContain("only real screenplay content");
    expect(prompt).toContain("DUAL DIALOGUE BEGINS HERE");
  });
});
