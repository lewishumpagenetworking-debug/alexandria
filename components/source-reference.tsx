export function SourceReference({ label, text, note, compact = false }: {
  label: string;
  text: string;
  note?: string;
  compact?: boolean;
}) {
  return <aside className={`source-reference${compact ? " compact" : ""}`} aria-label="Reference for this question">
    <div className="source-reference-book">Reference · {label}</div>
    <blockquote>“{text}”</blockquote>
    {note && <p>{note}</p>}
  </aside>;
}
