import { describe, it, expect } from "vitest";
import {
  getMentionables,
  buildTurnContext,
  parseCitations,
} from "./references";
import { fountainToElements } from "../fountain";

const elements = fountainToElements(
  [
    "INT. KITCHEN - NIGHT",
    "",
    "MAYA",
    "One good scene.",
    "",
    "EXT. ROOFTOP - DAY",
    "",
    "Wind.",
  ].join("\n"),
);

describe("getMentionables", () => {
  it("lists scenes and characters", () => {
    const items = getMentionables(elements);
    expect(items.some((i) => i.token === "@Scene 1")).toBe(true);
    expect(items.some((i) => i.token === "@MAYA" && i.kind === "character")).toBe(
      true,
    );
  });
});

describe("buildTurnContext", () => {
  it("bundles a highlighted selection", () => {
    const ctx = buildTurnContext(elements, "what about this?", {
      text: "One good scene.",
      sceneIndex: 1,
      heading: "INT. KITCHEN - NIGHT",
    });
    expect(ctx).toContain("highlighted");
    expect(ctx).toContain("One good scene.");
  });

  it("pulls a mentioned scene into context in full", () => {
    const ctx = buildTurnContext(elements, "tighten @Scene 2 please", null);
    expect(ctx).toContain("Referenced Scene 2");
    expect(ctx).toContain("ROOFTOP");
  });

  it("notes a mentioned character's scenes", () => {
    const ctx = buildTurnContext(elements, "is @MAYA consistent?", null);
    expect(ctx).toContain("MAYA appears in scenes: 1");
  });

  it("returns empty when nothing is referenced", () => {
    expect(buildTurnContext(elements, "hello", null)).toBe("");
  });
});

describe("parseCitations", () => {
  it("splits scene references into clickable segments", () => {
    const segs = parseCitations("Look at Scene 2 then Scene 5.");
    const scenes = segs.filter((s) => s.type === "scene");
    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toMatchObject({ index: 2 });
  });
});
