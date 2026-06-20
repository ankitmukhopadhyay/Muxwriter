import { describe, it, expect } from "vitest";
import { runTool } from "./tools";
import { deriveScenes, fountainToElements } from "../fountain";

const elements = fountainToElements(
  [
    "INT. KITCHEN - NIGHT",
    "",
    "Maya pours coffee and curses the cursor.",
    "",
    "EXT. ROOFTOP - DAY",
    "",
    "The city exhales. A pigeon judges her.",
  ].join("\n"),
);

describe("search_script", () => {
  it("finds the scene containing a keyword and returns its scene id", () => {
    const result = runTool("search_script", { query: "pigeon" }, elements);
    expect(result).toContain("ROOFTOP");
    const rooftop = deriveScenes(elements).find((s) =>
      s.heading.includes("ROOFTOP"),
    )!;
    expect(result).toContain(rooftop.id);
  });

  it("reports when nothing matches", () => {
    const result = runTool("search_script", { query: "dragon" }, elements);
    expect(result).toContain("No scenes match");
  });
});

describe("get_scene", () => {
  it("fetches a scene by 1 based number", () => {
    const result = runTool("get_scene", { scene_number: 1 }, elements);
    expect(result).toContain("KITCHEN");
    expect(result).toContain("Maya pours coffee");
  });

  it("fetches a scene by id", () => {
    const rooftop = deriveScenes(elements).find((s) =>
      s.heading.includes("ROOFTOP"),
    )!;
    const result = runTool("get_scene", { scene_id: rooftop.id }, elements);
    expect(result).toContain("The city exhales");
  });

  it("reports a miss", () => {
    expect(runTool("get_scene", { scene_number: 99 }, elements)).toContain(
      "not found",
    );
  });
});
