"use client";

import { useEffect, useMemo, useState } from "react";
import { listCaptures } from "@/lib/capture-store";
import { loadBooks, type StoredBook } from "@/lib/application-store";
import { getGrowthSummary, type GrowthSummary } from "@/lib/growth-store";
import type { CaptureDraft } from "@/models/domain";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

type Inquiry = {
  id: string;
  question: string;
  currentView: string;
  createdAt: string;
};

const INQUIRIES_KEY = "alexandria-inquiries-v1";

function readInquiries(): Inquiry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(INQUIRIES_KEY) || "[]") as Inquiry[];
  } catch {
    return [];
  }
}

function persistInquiry(question: string, currentView: string) {
  const inquiry: Inquiry = {
    id: globalThis.crypto?.randomUUID?.() ?? `inquiry-${Date.now()}`,
    question,
    currentView,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(INQUIRIES_KEY, JSON.stringify([inquiry, ...readInquiries()].slice(0, 50)));
  return inquiry;
}

function tokens(text: string) {
  return [...new Set(text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])];
}

function scoreBook(book: StoredBook, query: string) {
  const terms = tokens(query);
  const haystack = `${book.title} ${book.author} ${book.highlights.join(" ")}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function scoreCapture(capture: CaptureDraft, query: string) {
  const terms = tokens(query);
  const haystack = `${capture.text} ${capture.type} ${capture.category ?? ""} ${capture.relatedBook ?? ""}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function FunctionalAtriumView({ navigate }: { navigate: (space: AlexandriaSpace) => void }) {
  const [books, setBooks] = useState<StoredBook[]>([]);
  const [captures, setCaptures] = useState<CaptureDraft[]>([]);
  const [question, setQuestion] = useState("");
  const [currentView, setCurrentView] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [growth, setGrowth] = useState<GrowthSummary | null>(null);

  const refresh = () => {
    setBooks(loadBooks());
    setCaptures(listCaptures());
    setGrowth(getGrowthSummary());
  };

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("alexandria:data", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("alexandria:data", refresh);
    };
  }, []);

  const currentBook = books.find((book) => !book.completed) ?? books[0];
  const totalHighlights = books.reduce((sum, book) => sum + book.highlights.length, 0);
  const totalPrinciples = books.reduce((sum, book) => sum + book.principles, 0);
  const pendingHighlights = books.flatMap((book) =>
    book.highlights.map((text) => ({ bookTitle: book.title, text }))
  ).slice(-4).reverse();

  const questionCaptures = captures.filter((capture) => capture.type === "Question").slice(0, 3);

  const retrieval = useMemo(() => {
    if (!submittedQuestion) return { books: [] as StoredBook[], captures: [] as CaptureDraft[] };
    const rankedBooks = books
      .map((book) => ({ book, score: scoreBook(book, submittedQuestion) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.book);
    const rankedCaptures = captures
      .map((capture) => ({ capture, score: scoreCapture(capture, submittedQuestion) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.capture);
    return { books: rankedBooks, captures: rankedCaptures };
  }, [books, captures, submittedQuestion]);

  function beginInquiry(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setSubmittedQuestion(question.trim());
    setShowReflection(true);
    setShowResults(false);
    setCurrentView("");
  }

  function revealLibrary() {
    if (!currentView.trim()) return;
    persistInquiry(submittedQuestion, currentView.trim());
    setShowResults(true);
  }

  const noMatches = showResults && retrieval.books.length === 0 && retrieval.captures.length === 0;

  return (
    <section className="view active">
      <div className="hero">
        <div className="seeker">
          <div className="eyebrow">The Atrium · Daily inquiry</div>
          <h1>What are you seeking?</h1>
          <p>Bring a real decision, uncertainty, work problem, or question. Alexandria makes you think before it retrieves.</p>
          <form className="seek-box" onSubmit={beginInquiry}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              aria-label="Your question"
              placeholder="What am I trying to understand or decide?"
            />
            <button>Enter the Library</button>
          </form>
          <div className="seek-hints">Try: “What have I learned about uncertainty?” · “What assumptions am I making?” · “What should this decision depend on?”</div>

          {showReflection && (
            <div className="counsel show">
              <strong>Before retrieval: what do you currently think?</strong>
              <p>State your present view from memory. Include the strongest reason for it and what evidence could change your mind.</p>
              <textarea
                className="answer"
                value={currentView}
                onChange={(event) => setCurrentView(event.target.value)}
                placeholder="My current view is… I believe this because… I would revise it if…"
              />
              <div className="button-row">
                <button className="small-btn" onClick={() => { setShowReflection(false); setShowResults(false); }}>Clear inquiry</button>
                <button className="small-btn primary" onClick={revealLibrary} disabled={!currentView.trim()}>Reveal relevant material</button>
              </div>
            </div>
          )}

          {showResults && (
            <div className="counsel show">
              <strong>Alexandria retrieved from your own record.</strong>
              {noMatches ? (
                <p>No strong local match yet. Preserve this as a question, then use the Library, Interrogation Chamber, or your next reading session to build an answer.</p>
              ) : (
                <>
                  {retrieval.books.map((book) => (
                    <p key={book.id}><b>{book.title}</b> · {book.author} · {book.highlights.length} saved highlights · {book.principles} principles</p>
                  ))}
                  {retrieval.captures.map((capture) => (
                    <p key={capture.id}><b>{capture.type}</b> · {capture.text}</p>
                  ))}
                </>
              )}
              <div className="button-row">
                <button className="small-btn" onClick={() => navigate("library")}>Search the Library</button>
                <button className="small-btn primary" onClick={() => navigate("interrogation")}>Interrogate the question</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="content">
        {growth && <article className="card reminders-banner">
          <div className="card-head">
            <div><div className="kicker">Today</div><h2>{growth.pointsToday} points today · {growth.totalPoints} total · streak {growth.streakDays}</h2></div>
            <button className="ghost-btn" onClick={() => navigate("path")}>Open the Path</button>
          </div>
          {growth.reminders.length > 0 ? <div className="reminder-list">
            {growth.reminders.map((reminder) => <div className={`reminder reminder-${reminder.tone}`} key={reminder.id}>{reminder.text}</div>)}
          </div> : <p className="meta">Nothing urgent — everything reviewed is on schedule.</p>}
        </article>}
        <div className="atrium-grid">
          <div className="stack">
            <article className="card">
              <div className="card-head">
                <div><div className="kicker">Continue reading</div><h2>{currentBook?.title ?? "Add your first book"}</h2></div>
                <button className="ghost-btn" onClick={() => navigate("ledger")}>Open ledger</button>
              </div>
              {currentBook ? (
                <div className="book-row">
                  <div className="book-cover">{currentBook.title.toUpperCase()}</div>
                  <div>
                    <p className="meta">{currentBook.author}</p>
                    <p>{currentBook.currentPage} of {currentBook.totalPages} pages. Last read {currentBook.lastRead}.</p>
                    <div className="progress"><span style={{ width: `${Math.round(currentBook.currentPage / currentBook.totalPages * 100)}%` }} /></div>
                    <div className="meta">{currentBook.highlights.length} highlights · {currentBook.principles} principles</div>
                    <button className="action-link" onClick={() => navigate("ledger")}>Continue at page {Math.min(currentBook.currentPage + 1, currentBook.totalPages)} →</button>
                  </div>
                </div>
              ) : <p className="meta">The Reading Ledger is empty. Add a book to begin feeding Alexandria.</p>}
            </article>

            <article className="card">
              <div className="card-head">
                <div><div className="kicker">Awaiting interrogation · {pendingHighlights.length}</div><h2>Ideas that have not earned their place yet</h2></div>
                <button className="ghost-btn" onClick={() => navigate("interrogation")}>Begin interrogation</button>
              </div>
              <div className="list">
                {pendingHighlights.length ? pendingHighlights.slice(0, 2).map((highlight, index) => (
                  <div className="list-item" key={`${highlight.bookTitle}-${index}`}><strong>“{highlight.text}”</strong><span>{highlight.bookTitle}</span></div>
                )) : <div className="list-item"><strong>No personal highlights waiting yet.</strong><span>Add one from the Reading Ledger.</span></div>}
              </div>
            </article>

            <article className="card">
              <div className="kicker">Recent captures</div>
              <h2>Raw material entering the Library</h2>
              <div className="list top-gap">
                {captures.length ? captures.slice(0, 3).map((capture) => (
                  <div className="list-item" key={capture.id}><strong>{capture.text}</strong><span>{capture.type} · {capture.category || "Unclassified"}</span></div>
                )) : <div className="list-item"><strong>Capture your first thought, question, or decision.</strong><span>Use the Capture button in the navigation.</span></div>}
              </div>
            </article>
          </div>

          <div className="stack">
            <article className="card">
              <div className="kicker">Return to the Agora</div>
              <h2>Train spontaneous reasoning under pressure.</h2>
              <p className="meta">No principle is named for you. Retrieve what matters yourself.</p>
              <button className="small-btn primary" onClick={() => navigate("agora")}>Enter the Agora</button>
            </article>

            <article className="card">
              <div className="kicker">Enter the Forum</div>
              <h2>Turn understanding into clear, compelling speech.</h2>
              <p className="meta">Explain, compress, defend, and adapt to the audience.</p>
              <button className="action-link" onClick={() => navigate("forum")}>Begin speaking →</button>
            </article>

            <article className="card">
              <div className="kicker">Questions worth pursuing</div>
              <div className="list">
                {questionCaptures.length ? questionCaptures.map((capture) => (
                  <div className="list-item" key={capture.id}><strong>{capture.text}</strong><span>{capture.category || "Unclassified"} · captured</span></div>
                )) : <>
                  <div className="list-item"><strong>What belief would be most expensive to discover is wrong?</strong><span>Suggested inquiry</span></div>
                  <div className="list-item"><strong>Where am I mistaking familiarity for understanding?</strong><span>Suggested inquiry</span></div>
                </>}
              </div>
            </article>

            <article className="card metric-card">
              <div className="kicker">The Library grows</div>
              <div className="stat-row">
                <div className="stat"><b>{books.length}</b><span>sources</span></div>
                <div className="stat"><b>{totalHighlights}</b><span>highlights</span></div>
                <div className="stat"><b>{totalPrinciples}</b><span>principles</span></div>
                <div className="stat"><b>{captures.length}</b><span>captures</span></div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
