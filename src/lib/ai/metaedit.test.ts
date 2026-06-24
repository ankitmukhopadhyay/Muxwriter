import { describe, expect, it } from "vitest";
import { applySetNote, applyUpdateStory } from "./metaedit";
import { emptyMetadata } from "../muxw";

describe("applySetNote", () => {
  it("saves a global note, appending by default", () => {
    let m = emptyMetadata();
    m = applySetNote(m, { scope: "global", text: "Act two sags." }).meta;
    m = applySetNote(m, { scope: "global", text: "Fix the midpoint." }).meta;
    expect(m.notes.global).toBe("Act two sags.\nFix the midpoint.");
  });

  it("replaces when asked", () => {
    let m = emptyMetadata();
    m = applySetNote(m, { scope: "global", text: "first" }).meta;
    m = applySetNote(m, { scope: "global", text: "second", mode: "replace" }).meta;
    expect(m.notes.global).toBe("second");
  });

  it("saves scene and character notes under the right keys", () => {
    let m = emptyMetadata();
    m = applySetNote(m, { scope: "scene", scene_number: 3, text: "slow" }).meta;
    m = applySetNote(m, { scope: "character", character: "maya", text: "wants out" }).meta;
    expect(m.notes.byScene["3"]).toBe("slow");
    expect(m.notes.byCharacter.MAYA).toBe("wants out");
  });
});

describe("applyUpdateStory", () => {
  it("updates bible fields and the title", () => {
    const { meta, summary } = applyUpdateStory(emptyMetadata(), {
      title: "The Long Night",
      logline: "A writer fights a blank page.",
      tone: "wry",
    });
    expect(meta.title).toBe("The Long Night");
    expect(meta.storyBible.logline).toBe("A writer fights a blank page.");
    expect(meta.storyBible.tone).toBe("wry");
    expect(summary).toContain("title");
  });

  it("adds and then updates a character by name", () => {
    let m = emptyMetadata();
    m = applyUpdateStory(m, { character: { name: "Maya", description: "30s" } }).meta;
    m = applyUpdateStory(m, { character: { name: "maya", description: "30s, tired" } }).meta;
    expect(m.storyBible.characters).toHaveLength(1);
    expect(m.storyBible.characters[0].description).toBe("30s, tired");
  });

  it("reports nothing to update for empty input", () => {
    expect(applyUpdateStory(emptyMetadata(), {}).summary).toMatch(/nothing/i);
  });
});
