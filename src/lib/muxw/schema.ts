/**
 * The `.muxw` metadata schema.
 *
 * A `.muxw` file is plain text: a JSON metadata block (this schema) followed by
 * the Fountain script body. The metadata holds everything that is NOT
 * derivable from the script text itself: the story bible the AI partner reads
 * as persistent context, the rolling scene summary log, and notes. Keeping it
 * as readable JSON above human readable Fountain means the whole file stays
 * diffable in git, which fits the open source nature of the project.
 */

export interface BibleCharacter {
  name: string;
  description: string;
}

/**
 * Persistent, full detail story context. Stays small regardless of script
 * length and is always included in the AI partner's context (CLAUDE.md style).
 */
export interface StoryBible {
  logline: string;
  characters: BibleCharacter[];
  world: string;
  tone: string;
  themes: string;
  relationships: string;
}

/**
 * One compressed summary of a completed scene. The rolling log of these grows
 * slowly and keeps AI context cost flat as the script grows. Keyed by scene
 * index plus the heading text so entries can be re-linked to scenes on load.
 */
export interface SceneLogEntry {
  index: number;
  heading: string;
  summary: string;
}

/** Notes that are authored, not derived, so they live in the file's metadata. */
export interface Notes {
  /** Freeform global story notes. */
  global: string;
  /** Per scene notes, keyed by scene index. */
  byScene: Record<string, string>;
  /** Per character notes, keyed by uppercased character name. */
  byCharacter: Record<string, string>;
}

export interface MuxwMetadata {
  /** Format version, bumped if the schema changes in a breaking way. */
  version: number;
  title: string;
  author: string;
  /** Title page contact block (address, phone, email). */
  contact: string;
  /** Title page draft label, e.g. "First Draft" or a date. */
  draftDate: string;
  /** Title page copyright / rights line. */
  copyright: string;
  storyBible: StoryBible;
  sceneLog: SceneLogEntry[];
  notes: Notes;
}

export const MUXW_VERSION = 1;

/** A fresh, empty metadata block for a new document. */
export function emptyMetadata(): MuxwMetadata {
  return {
    version: MUXW_VERSION,
    title: "",
    author: "",
    contact: "",
    draftDate: "",
    copyright: "",
    storyBible: {
      logline: "",
      characters: [],
      world: "",
      tone: "",
      themes: "",
      relationships: "",
    },
    sceneLog: [],
    notes: { global: "", byScene: {}, byCharacter: {} },
  };
}

/**
 * Coerces arbitrary parsed JSON into a complete metadata object, filling any
 * missing fields with empty defaults. This keeps older or hand edited files
 * loadable as the schema evolves.
 */
export function normalizeMetadata(raw: unknown): MuxwMetadata {
  const base = emptyMetadata();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const bible = (obj.storyBible ?? {}) as Record<string, unknown>;
  const notes = (obj.notes ?? {}) as Record<string, unknown>;

  return {
    version: typeof obj.version === "number" ? obj.version : MUXW_VERSION,
    title: typeof obj.title === "string" ? obj.title : "",
    author: typeof obj.author === "string" ? obj.author : "",
    contact: str(obj.contact),
    draftDate: str(obj.draftDate),
    copyright: str(obj.copyright),
    storyBible: {
      logline: str(bible.logline),
      characters: Array.isArray(bible.characters)
        ? (bible.characters as unknown[]).map((c) => {
            const cc = (c ?? {}) as Record<string, unknown>;
            return { name: str(cc.name), description: str(cc.description) };
          })
        : [],
      world: str(bible.world),
      tone: str(bible.tone),
      themes: str(bible.themes),
      relationships: str(bible.relationships),
    },
    sceneLog: Array.isArray(obj.sceneLog)
      ? (obj.sceneLog as unknown[]).map((e) => {
          const ee = (e ?? {}) as Record<string, unknown>;
          return {
            index: typeof ee.index === "number" ? ee.index : 0,
            heading: str(ee.heading),
            summary: str(ee.summary),
          };
        })
      : [],
    notes: {
      global: str(notes.global),
      byScene: isStringMap(notes.byScene) ? notes.byScene : {},
      byCharacter: isStringMap(notes.byCharacter) ? notes.byCharacter : {},
    },
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isStringMap(v: unknown): v is Record<string, string> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
