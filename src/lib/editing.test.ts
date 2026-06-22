import { describe, it, expect } from "vitest";
import {
  lineDiff,
  buildProposedEdit,
  buildScriptProposal,
  applyProposedEdit,
  sanitizeFountain,
} from "./editing";
import { deriveScenes, fountainToElements } from "./fountain";

describe("sanitizeFountain", () => {
  it("removes markdown the AI leaks into a script", () => {
    const dirty = [
      "# Act One",
      "**INT. KITCHEN - NIGHT**",
      "",
      "- Maya pours coffee.",
      "1. She sits down.",
      "Read the `cursor` blink.",
    ].join("\n");
    const clean = sanitizeFountain(dirty);
    expect(clean).not.toMatch(/[*#`]/);
    expect(clean).toContain("INT. KITCHEN - NIGHT");
    expect(clean).toContain("Maya pours coffee.");
    expect(clean).toContain("She sits down.");
    expect(clean).toContain("the cursor blink");
  });

  it("leaves valid Fountain syntax intact", () => {
    const fountain = "EXT. ROOFTOP - DAY\n\n> CUT TO:\n\n(beat)";
    expect(sanitizeFountain(fountain)).toBe(fountain);
  });
});

describe("lineDiff", () => {
  it("marks removed, added, and unchanged lines", () => {
    const diff = lineDiff("a\nb\nc", "a\nx\nc");
    expect(diff).toEqual([
      { type: "same", text: "a" },
      { type: "removed", text: "b" },
      { type: "added", text: "x" },
      { type: "same", text: "c" },
    ]);
  });
});

describe("proposed edits", () => {
  const elements = fountainToElements(
    [
      "INT. KITCHEN - NIGHT",
      "",
      "Maya pours coffee.",
      "",
      "EXT. ROOFTOP - DAY",
      "",
      "Wind.",
    ].join("\n"),
  );

  it("builds an edit targeting a scene by number", () => {
    const edit = buildProposedEdit(elements, {
      scene_number: 2,
      new_text: "EXT. ROOFTOP - NIGHT\n\nThe city hums.",
      note: "Change time of day.",
    });
    expect(edit).not.toBeNull();
    expect(edit!.sceneIndex).toBe(2);
    expect(edit!.oldText).toContain("ROOFTOP - DAY");
    expect(edit!.newText).toContain("ROOFTOP - NIGHT");
  });

  it("returns null for a missing scene or empty text", () => {
    expect(buildProposedEdit(elements, { scene_number: 9, new_text: "x" })).toBeNull();
    expect(buildProposedEdit(elements, { scene_number: 1, new_text: "" })).toBeNull();
  });

  it("applies an accepted edit, replacing only the target scene", () => {
    const edit = buildProposedEdit(elements, {
      scene_number: 2,
      new_text: "EXT. ROOFTOP - NIGHT\n\nThe city hums.",
    })!;
    const next = applyProposedEdit(elements, edit);
    const scenes = deriveScenes(next);
    expect(scenes).toHaveLength(2);
    expect(scenes[0].heading).toContain("KITCHEN"); // scene 1 untouched
    expect(scenes[1].heading).toBe("EXT. ROOFTOP - NIGHT");
    expect(next.some((e) => e.text.includes("The city hums."))).toBe(true);
    expect(next.some((e) => e.text === "Wind.")).toBe(false);
  });
});

describe("whole script proposals", () => {
  it("builds a script proposal and applies it as the whole document", () => {
    const existing = fountainToElements("INT. OLD - DAY\n\nOld action.\n");
    const draft = "INT. NEW - NIGHT\n\nMaya types.\n\nMAYA\nA new draft.\n";
    const edit = buildScriptProposal(existing, { content: draft, note: "Draft" });
    expect(edit).not.toBeNull();
    expect(edit!.scope).toBe("script");
    expect(edit!.oldText).toContain("OLD");

    const next = applyProposedEdit(existing, edit!);
    const scenes = deriveScenes(next);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].heading).toBe("INT. NEW - NIGHT");
    expect(next.some((e) => e.text === "A new draft.")).toBe(true);
    expect(next.some((e) => e.text === "Old action.")).toBe(false);
  });

  it("returns null for an empty draft", () => {
    expect(buildScriptProposal([], { content: "" })).toBeNull();
  });
});
