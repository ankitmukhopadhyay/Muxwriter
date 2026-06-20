import { describe, it, expect } from "vitest";
import {
  characterBreakdown,
  sceneBreakdown,
  locationBreakdown,
} from "./insights";
import { fountainToElements } from "./fountain";

const elements = fountainToElements(
  [
    "INT. KITCHEN - NIGHT",
    "",
    "MAYA",
    "One.",
    "",
    "MAYA",
    "Two.",
    "",
    "SAM",
    "Hey.",
    "",
    "EXT. KITCHEN - DAY",
    "",
    "MAYA",
    "Back again.",
  ].join("\n"),
);

describe("characterBreakdown", () => {
  it("counts dialogue lines and scene appearances", () => {
    const stats = characterBreakdown(elements);
    const maya = stats.find((s) => s.name === "MAYA")!;
    const sam = stats.find((s) => s.name === "SAM")!;
    expect(maya.lines).toBe(3);
    expect(maya.scenes).toBe(2);
    expect(sam.lines).toBe(1);
    expect(sam.scenes).toBe(1);
    // Sorted by line count, Maya first.
    expect(stats[0].name).toBe("MAYA");
  });
});

describe("sceneBreakdown", () => {
  it("reports environment, location, and time of day", () => {
    const scenes = sceneBreakdown(elements);
    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toMatchObject({
      environment: "INT",
      location: "KITCHEN",
      timeOfDay: "NIGHT",
    });
    expect(scenes[1].environment).toBe("EXT");
  });
});

describe("locationBreakdown", () => {
  it("counts scenes per location", () => {
    const locs = locationBreakdown(elements);
    expect(locs[0]).toEqual({ location: "KITCHEN", count: 2 });
  });
});
