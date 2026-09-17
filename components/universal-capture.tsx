"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptureDraft } from "@/models/domain";

const captureTypes: CaptureDraft["type"][] = ["Thought", "Question", "Book highlight", "Observation", "Work problem", "Decision", "Application", "Feedback", "Changed belief", "Connection", "Experiment"];
const sources = ["Direct thought", "Book", "Conversation", "Work", "Experience", "Observation"];
const categories = ["Unclassified", "Natural Philosophy", "Human Nature", "Strategy & Power", "Commerce & Creation", "Logic & Systems", "The Examined Life"];

export function UniversalCapture({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: Omit<CaptureDraft, "id" | "createdAt" | "inputSource">) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<CaptureDraft["type"]>("Thought");
  const [source, setSource] = useState(sources[0]);
  const [category, setCategory] = useState(categories[0]);
  const [relatedBook, setRelatedBook] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSave({ text: text.trim(), type, source, category, relatedBook });
    setText("");
    onClose();
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-head"><div><div className="kicker">Universal capture</div><h2>Preserve the thought.</h2></div><button type="button" className="close" onClick={onClose} aria-label="Close">×</button></div>
        <div className="modal-body">
          <p className="meta">Speak or type freely. Classification can wait, but provenance should not.</p>
          <textarea className="capture-area" value={text} onChange={(event) => setText(event.target.value)} placeholder="What did you notice, learn, question, decide, or change your mind about?" autoFocus />
          <div className="capture-types">{captureTypes.map((item) => <button key={item} type="button" className={`pill${type === item ? " active" : ""}`} onClick={() => setType(item)}>{item}</button>)}</div>
          <div className="form-grid">
            <label>Source<select value={source} onChange={(event) => setSource(event.target.value)}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="form-span">Related book (optional)<input value={relatedBook} onChange={(event) => setRelatedBook(event.target.value)} placeholder="Search or enter a title" /></label>
          </div>
          <div className="modal-actions"><span className="voice-note"><span className="voice-orb">◉</span> Dictation-ready field</span><button className="small-btn primary" type="submit">Save to inbox</button></div>
        </div>
      </form>
    </dialog>
  );
}
