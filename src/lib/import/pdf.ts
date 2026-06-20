import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { pageToLines, linesToFountain, type Line } from "./reconstruct";

/**
 * Extracts a screenplay from a PDF into Fountain text. PDF carries no element
 * structure, so we group text into lines, insert blank lines on vertical gaps,
 * and let the Fountain parser recover the structure. The line and gap logic
 * lives in reconstruct.ts (pure, tested); this file is the pdfjs glue.
 */

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export async function pdfToFountain(data: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false })
    .promise;

  const lines: Line[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    lines.push(
      ...pageToLines(content.items as { str: string; transform: number[] }[]),
    );
  }
  return linesToFountain(lines);
}
