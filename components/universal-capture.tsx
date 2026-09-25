"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptureDraft } from "@/models/domain";

const captureTypes: CaptureDraft["type"][] = ["Thought", "Question", "Observation", "Decision", "Application", "Changed belief", "Connection", "Book highlight", "Work problem", "Experiment", "Feedback"];
const categories = ["Unclassified", "Natural Philosophy", "Human Nature", "Strategy & Power", "Commerce & Creation", "Logic & Systems", "The Examined Life"];

export function UniversalCapture({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: Omit<CaptureDraft, "id" | "createdAt" | "inputSource">) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<CaptureDraft["type"]>("Thought");
  const [category, setCategory] = useState(categories[0]);
  const [relatedBook, setRelatedBook] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSave({ text: text.trim(), type, source: source || undefined, category, relatedBook: relatedBook || undefined });
    setText("");
    setSource("");
    setRelatedBook("");
    onClose();
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-head">
          <div><div className="kicker">Capture idea</div><h2>Save it before it's gone.</h2></div>
          <button type="button" className="close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="capture-types">
            {captureTypes.map((item) => (
              <button key={item} type="button" className={`pill${type === item ? " active" : ""}`} onClick={() => setType(item)}>{item}</button>
            ))}
          </div>
          <textarea
            className="capture-area"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={type === "Question" ? "What do you want to understand or find out?" : type === "Decision" ? "What decision are you making or have made?" : type === "Changed belief" ? "What did you believe before, and what changed?" : "What did you notice, learn, or want to remember?"}
            autoFocus
          />
          <div className="form-grid">
            <label>Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Source (optional)
              <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Where did this come from?" />
            </label>
            <label className="form-span">Related book (optional)
              <input value={relatedBook} onChange={(event) => setRelatedBook(event.target.value)} placeholder="Book title, if relevant" />
            </label>
          </div>
          <div className="modal-actions">
            <span className="voice-note"><span className="voice-orb">◉</span> Dictation-ready</span>
            <button className="small-btn primary" type="submit" disabled={!text.trim()}>Save idea</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
