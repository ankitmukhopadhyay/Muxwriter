import type { MuxwMetadata } from "../muxw";

/**
 * Pure metadata mutations behind the partner's set_note and update_story tools.
 * Each returns the new metadata plus a short human summary the partner echoes
 * back to the writer. Notes append by default so the partner never silently
 * destroys something the writer wrote; "replace" is opt in.
 */

function joinNote(existing: string, addition: string, mode: string): string {
  const add = addition.trim();
  if (mode === "replace" || !existing.trim()) return add;
  return `${existing.trim()}\n${add}`;
}

export function applySetNote(
  meta: MuxwMetadata,
  input: Record<string, unknown>,
): { meta: MuxwMetadata; summary: string } {
  const text = String(input.text ?? "").trim();
  if (!text) return { meta, summary: "No note text was provided." };
  const mode = input.mode === "replace" ? "replace" : "append";
  const scope = String(input.scope ?? "global");

  if (scope === "scene" && typeof input.scene_number === "number") {
    const key = String(input.scene_number);
    const next = {
      ...meta,
      notes: {
        ...meta.notes,
        byScene: {
          ...meta.notes.byScene,
          [key]: joinNote(meta.notes.byScene[key] ?? "", text, mode),
        },
      },
    };
    return { meta: next, summary: `Saved a note on Scene ${key}.` };
  }

  if (scope === "character" && typeof input.character === "string") {
    const name = input.character.trim().toUpperCase();
    const next = {
      ...meta,
      notes: {
        ...meta.notes,
        byCharacter: {
          ...meta.notes.byCharacter,
          [name]: joinNote(meta.notes.byCharacter[name] ?? "", text, mode),
        },
      },
    };
    return { meta: next, summary: `Saved a note on ${name}.` };
  }

  const next = {
    ...meta,
    notes: { ...meta.notes, global: joinNote(meta.notes.global, text, mode) },
  };
  return { meta: next, summary: "Saved a global story note." };
}

export function applyUpdateStory(
  meta: MuxwMetadata,
  input: Record<string, unknown>,
): { meta: MuxwMetadata; summary: string } {
  const changed: string[] = [];
  const next: MuxwMetadata = {
    ...meta,
    storyBible: {
      ...meta.storyBible,
      characters: [...meta.storyBible.characters],
    },
  };

  const setTop = (key: "title" | "author", label: string) => {
    if (typeof input[key] === "string" && input[key]) {
      next[key] = String(input[key]);
      changed.push(label);
    }
  };
  setTop("title", "title");
  setTop("author", "author");

  const bibleKeys: Array<keyof typeof next.storyBible> = [
    "logline",
    "world",
    "tone",
    "themes",
    "relationships",
  ];
  for (const key of bibleKeys) {
    const value = input[key];
    if (typeof value === "string" && value) {
      next.storyBible[key] = value as never;
      changed.push(key);
    }
  }

  const character = input.character as Record<string, unknown> | undefined;
  if (character && typeof character.name === "string" && character.name) {
    const name = character.name.trim();
    const description = String(character.description ?? "");
    const existing = next.storyBible.characters.findIndex(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing >= 0) {
      next.storyBible.characters[existing] = { name, description };
    } else {
      next.storyBible.characters.push({ name, description });
    }
    changed.push(`character ${name}`);
  }

  if (changed.length === 0) {
    return { meta, summary: "Nothing to update was provided." };
  }
  return { meta: next, summary: `Updated ${changed.join(", ")}.` };
}
