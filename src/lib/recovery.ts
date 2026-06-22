import type { ScriptElement } from "./fountain";
import { parseMuxw, serializeMuxw, type MuxwMetadata } from "./muxw";
import { deleteAppFile, readAppFile, writeAppFile } from "./store";

/**
 * Crash recovery for unsaved work.
 *
 * While a document has unsaved changes, the editor periodically writes a
 * snapshot of it (the full serialized `.muxw`, plus its path) to a single
 * recovery file. On the next launch, if a snapshot is present, the writer is
 * offered the chance to restore it. Saving, opening, or starting a new
 * document clears the snapshot, so it only ever holds work that was never
 * written to disk.
 */

const RECOVERY_FILE = "recovery.json";

export interface RecoverySnapshot {
  /** The document's own path, or null if it was never saved. */
  path: string | null;
  /** Serialized `.muxw` text of the document at snapshot time. */
  muxw: string;
  savedAt: number;
}

/** Writes a recovery snapshot of the current document. */
export async function writeRecovery(
  path: string | null,
  metadata: MuxwMetadata,
  elements: ScriptElement[],
): Promise<void> {
  const snapshot: RecoverySnapshot = {
    path,
    muxw: serializeMuxw(metadata, elements),
    savedAt: Date.now(),
  };
  await writeAppFile(RECOVERY_FILE, JSON.stringify(snapshot));
}

/** Reads the recovery snapshot, or null if none is stored or it is unreadable. */
export async function readRecovery(): Promise<RecoverySnapshot | null> {
  const raw = await readAppFile(RECOVERY_FILE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.muxw !== "string" || !parsed.muxw.trim()) return null;
    return {
      path: typeof parsed.path === "string" ? parsed.path : null,
      muxw: parsed.muxw,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Parses a snapshot back into a document. */
export function restoreSnapshot(snapshot: RecoverySnapshot): {
  metadata: MuxwMetadata;
  elements: ScriptElement[];
} {
  return parseMuxw(snapshot.muxw);
}

/** Removes the recovery snapshot. */
export async function clearRecovery(): Promise<void> {
  await deleteAppFile(RECOVERY_FILE);
}
