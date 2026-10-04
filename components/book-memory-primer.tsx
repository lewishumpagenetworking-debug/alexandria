"use client";

import { getBookMemoryContext } from "@/lib/book-context-store";

export function BookMemoryPrimer({ sourceId }: { sourceId: string }) {
  const context = getBookMemoryContext(sourceId);
  if (!context) return null;

  return <article className="book-memory-primer">
    <div className="book-memory-primer-head">
      <div>
        <div className="kicker">{context.completed ? "Book memory · finished-book breakdown" : "Book memory · working context"}</div>
        <strong>{context.sourceTitle}</strong>
        <span>{context.sourceCreator}</span>
      </div>
      <span className={"pill small" + (context.hasBreakdown ? " active" : "")}>{context.hasBreakdown ? "context loaded" : "title anchor"}</span>
    </div>

    <p className="book-memory-core">{context.primary}</p>

    {context.hasBreakdown && <details className="book-memory-details">
      <summary>Refresh the wider book model</summary>
      <div className="book-memory-grid">
        {context.recall && <div><span>Recall</span><p>{context.recall}</p></div>}
        {context.diagnosis && <div><span>Diagnosis</span><p>{context.diagnosis}</p></div>}
        {context.reduction && <div><span>Reduced principles</span><p>{context.reduction}</p></div>}
        {context.reconstruction && <div><span>Rebuilt model</span><p>{context.reconstruction}</p></div>}
        {context.application && <div><span>Application</span><p>{context.application}</p></div>}
      </div>
    </details>}
  </article>;
}
