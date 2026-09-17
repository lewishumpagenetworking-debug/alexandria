import type { Highlight, Interpretation, Principle, Source } from "@/models/domain";

export const spreadsheetColumns = [
  "record_type",
  "source_title",
  "source_creator",
  "location",
  "text",
  "interpretation",
  "principle",
  "hall",
] as const;

export interface ImportRow {
  rowNumber: number;
  values: Partial<Record<(typeof spreadsheetColumns)[number], string>>;
}

export interface ImportIssue {
  rowNumber: number;
  column?: string;
  message: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  issues: ImportIssue[];
  mapped: Array<Source | Highlight | Interpretation | Principle>;
}

/** Adapter boundary for a future XLSX parser. No spreadsheet library is required yet. */
export interface SpreadsheetImporter {
  parse(file: ArrayBuffer): Promise<ImportRow[]>;
  validate(rows: ImportRow[]): ImportIssue[];
  preview(rows: ImportRow[]): ImportPreview;
}
