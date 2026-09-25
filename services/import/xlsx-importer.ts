import * as XLSX from "@e965/xlsx";
import { halls } from "@/data/mock-data";
import { addHighlight, addInterpretation, addPrinciple } from "@/lib/library-notes-store";
import { loadBooks, saveBooks } from "@/lib/application-store";
import { saveCapture } from "@/lib/capture-store";
import { awardPoints, POINTS } from "@/lib/points-store";
import { registerCard } from "@/lib/retrieval-store";
import type { Highlight, Interpretation, Principle } from "@/models/domain";
import { spreadsheetColumns, type ImportIssue, type ImportPreview, type ImportRow, type SpreadsheetImporter } from "./spreadsheet-import";

/** Generates the downloadable .xlsx template for a book's notes, pre-filled with its title/author. */
export function createNotesTemplate(book: { title: string; author: string }): Blob {
  const starterRows = Array.from({ length: 25 }, () => ({
    record_type: "", source_title: book.title, source_creator: book.author, location: "", text: "", interpretation: "", principle: "", hall: "", priority: "",
  }));
  const notesSheet = XLSX.utils.json_to_sheet(starterRows, { header: [...spreadsheetColumns] });
  const legendSheet = XLSX.utils.aoa_to_sheet([
    ["Column", "Meaning"],
    ["record_type", "\"highlight\" (default), \"question\", or leave blank"],
    ["source_title / source_creator", "Pre-filled — change only if this row is from a different source"],
    ["location", "Page, chapter, or timestamp (optional)"],
    ["text", "The passage, note, or question itself"],
    ["interpretation", "What you think it means, in your own words (optional)"],
    ["principle", "A standalone principle this row supports — fill this with or without 'text' (optional)"],
    ["hall", "Which Hall of Knowledge this belongs to (optional)"],
    ["priority", "Optional 1-5 importance score. 5 = unusually valuable or broadly applicable. Leave blank if unsure."],
    [], ["Halls:"], ...halls.map((hall) => [hall.title]),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, notesSheet, "Notes");
  XLSX.utils.book_append_sheet(workbook, legendSheet, "Legend");
  const array = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Blob([array], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

interface MappedRow {
  highlight?: Omit<Highlight, "id" | "capturedAt">;
  interpretation?: Omit<Interpretation, "id" | "createdAt" | "highlightId">;
  principle?: Omit<Principle, "id">;
  question?: string;
  priorityWeight?: number;
}

function mapRow(row: ImportRow, sourceId: string): MappedRow {
  const values = row.values;
  const type = (values.record_type || "").toLowerCase().trim();
  const text = values.text?.trim();
  const interpretation = values.interpretation?.trim();
  const principle = values.principle?.trim();
  const mapped: MappedRow = {};
  const priorityRaw = Number(values.priority || "");
  mapped.priorityWeight = Number.isFinite(priorityRaw) ? Math.max(0, Math.min(5, priorityRaw)) : 0;

  if (type === "question" && text) {
    mapped.question = text;
  } else if (text) {
    mapped.highlight = { sourceId, text, location: values.location?.trim() || undefined };
    if (interpretation) mapped.interpretation = { sourceId, text: interpretation, inputSource: "import" };
  }

  if (principle) {
    const hallTitle = values.hall?.trim().toLowerCase();
    const hall = hallTitle ? halls.find((item) => item.title.toLowerCase() === hallTitle) : undefined;
    mapped.principle = {
      statement: principle,
      explanation: !text && interpretation ? interpretation : undefined,
      sourceIds: [sourceId],
      hallIds: hall ? [hall.id] : undefined,
      confidence: 0.6,
      state: "collected",
    };
  }

  return mapped;
}

function validateRows(rows: ImportRow[]): ImportIssue[] {
  return rows
    .filter((row) => !row.values.text?.trim() && !row.values.principle?.trim())
    .map((row) => ({ rowNumber: row.rowNumber, message: "No text or principle in this row — it will be skipped." }));
}

export const xlsxImporter: SpreadsheetImporter = {
  async parse(file: ArrayBuffer): Promise<ImportRow[]> {
    const workbook = XLSX.read(file, { type: "array" });
    const sheetName = workbook.SheetNames.includes("Notes") ? "Notes" : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return raw.map((row, index) => {
      const values: ImportRow["values"] = {};
      for (const column of spreadsheetColumns) {
        const value = String(row[column] ?? "").trim();
        if (value) values[column] = value;
      }
      return { rowNumber: index + 2, values };
    });
  },

  validate: validateRows,

  preview(rows: ImportRow[]): ImportPreview {
    const issues = validateRows(rows);
    const mapped: ImportPreview["mapped"] = [];
    const now = new Date().toISOString();
    rows.forEach((row, index) => {
      const parts = mapRow(row, "preview");
      if (parts.highlight) mapped.push({ ...parts.highlight, id: `preview-${index}-highlight`, capturedAt: now });
      if (parts.interpretation) mapped.push({ ...parts.interpretation, id: `preview-${index}-interpretation`, createdAt: now });
      if (parts.principle) mapped.push({ ...parts.principle, id: `preview-${index}-principle` });
    });
    return { rows, issues, mapped };
  },
};

export interface ImportSummary {
  highlights: number;
  interpretations: number;
  principles: number;
  questions: number;
}

/** Actually persists validated rows against a real source, after the user has reviewed the preview. */
export function commitRows(rows: ImportRow[], context: { sourceId: string; sourceTitle: string }): ImportSummary {
  const summary: ImportSummary = { highlights: 0, interpretations: 0, principles: 0, questions: 0 };
  const highlightTexts: string[] = [];

  for (const row of rows) {
    const parts = mapRow(row, context.sourceId);

    if (parts.question) {
      saveCapture({ type: "Question", text: parts.question, relatedBook: context.sourceTitle, inputSource: "import" });
      summary.questions++;
    }

    let highlightId: string | undefined;
    if (parts.highlight) {
      const highlight = addHighlight(parts.highlight);
      highlightId = highlight.id;
      highlightTexts.push(highlight.text);
      registerCard("highlight", highlight.id, context.sourceTitle, highlight.text, (parts.priorityWeight ?? 0) * 8);
      summary.highlights++;
    }

    if (parts.interpretation) {
      addInterpretation({ ...parts.interpretation, highlightId });
      summary.interpretations++;
    }

    if (parts.principle) {
      const principle = addPrinciple({ ...parts.principle, highlightId });
      registerCard("principle", principle.id, context.sourceTitle, principle.statement, (parts.priorityWeight ?? 0) * 8);
      summary.principles++;
    }
  }

  // Also mirror into the plain StoredBook.highlights array so existing Ledger/Library/Path
  // views (which read that array directly, not the richer library-notes-store) pick this up.
  if (highlightTexts.length || summary.principles) {
    const books = loadBooks();
    const book = books.find((item) => item.id === context.sourceId);
    if (book) {
      saveBooks(books.map((item) => item.id === book.id
        ? { ...item, highlights: [...item.highlights, ...highlightTexts], principles: item.principles + summary.principles }
        : item));
    }
  }

  const rowsImported = summary.highlights + summary.principles + summary.questions;
  if (rowsImported > 0) {
    awardPoints("book-import", `Imported ${rowsImported} notes for ${context.sourceTitle}`, POINTS.bookImportPerRow * rowsImported);
  }

  return summary;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
