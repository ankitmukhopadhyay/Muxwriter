import { describe, it, expect } from "vitest";
import { lineDiff, buildProposedEdit, applyProposedEdit } from "./editing";
import { deriveScenes, fountainToElements } from "./fountain";

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
