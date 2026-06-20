import {
  elementsToFountain,
  fountainToElements,
  type ScriptElement,
} from "../fountain";
import {
  emptyMetadata,
  normalizeMetadata,
  type MuxwMetadata,
} from "./schema";

/**
 * Line marker that fences the JSON metadata block from the Fountain body.
 * Chosen to be vanishingly unlikely to appear at the start of a real script
 * line, so a plain Fountain file is never mistaken for having metadata.
 */
const MARKER = "%%MUXW%%";

export interface MuxwDocument {
  metadata: MuxwMetadata;
  elements: ScriptElement[];
}

/** Serializes metadata and script into the `.muxw` plain text format. */
export function serializeMuxw(
  metadata: MuxwMetadata,
  elements: ScriptElement[],
): string {
  const json = JSON.stringify(metadata, null, 2);
  const body = elementsToFountain(elements);
  return `${MARKER}\n${json}\n${MARKER}\n\n${body}`;
}

/**
 * Parses `.muxw` text into metadata and elements. A file without the metadata
 * marker is treated as plain Fountain (graceful import), and malformed
 * metadata falls back to empty defaults rather than failing the open.
 */
export function parseMuxw(text: string): MuxwDocument {
  if (!text.startsWith(MARKER)) {
    return { metadata: emptyMetadata(), elements: fountainToElements(text) };
  }

  const afterOpen = text.slice(MARKER.length);
  const closeIndex = afterOpen.indexOf(`\n${MARKER}`);
  if (closeIndex === -1) {
    // Opening marker but no close: treat the remainder as the body.
    return {
      metadata: emptyMetadata(),
      elements: fountainToElements(afterOpen),
    };
  }

  const jsonPart = afterOpen.slice(0, closeIndex);
  const body = afterOpen.slice(closeIndex + `\n${MARKER}`.length);

  let metadata: MuxwMetadata;
  try {
    metadata = normalizeMetadata(JSON.parse(jsonPart));
  } catch {
    metadata = emptyMetadata();
  }

  return { metadata, elements: fountainToElements(body.replace(/^\s+/, "")) };
}
