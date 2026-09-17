"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptureDraft } from "@/models/domain";

const captureTypes: CaptureDraft["type"][] = ["Question", "Idea", "Observation", "Decision", "Experience", "Revision"];

export function UniversalCapture({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (text: string, type: CaptureDraft["type"]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<CaptureDraft["type"]>("Question");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim(), type);
    setText("");
    onClose();
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-head"><div><div className="kicker">Universal capture</div><h2>Preserve the thought.</h2></div><button type="button" className="close" onClick={onClose} aria-label="Close">×</button></div>
        <div className="modal-body">
          <p className="meta">Speak or type freely. Classification can wait.</p>
          <textarea className="capture-area" value={text} onChange={(event) => setText(event.target.value)} placeholder="What did you notice, learn, question, decide, or change your mind about?" autoFocus />
          <div className="capture-types">
            {captureTypes.map((item) => <button key={item} type="button" className={`pill${type === item ? " active" : ""}`} onClick={() => setType(item)}>{item === "Revision" ? "Changed mind" : item}</button>)}
          </div>
          <div className="modal-actions"><span className="voice-note">◉ Voice-dictation compatible</span><button className="small-btn primary" type="submit">Preserve thought</button></div>
        </div>
      </form>
    </dialog>
  );
}
