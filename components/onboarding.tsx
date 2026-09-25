"use client";

import { useEffect, useRef, useState } from "react";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

const ONBOARDING_KEY = "alexandria-v2-onboarded";

const STEPS = [
  {
    icon: "📚",
    title: "Welcome to Alexandria",
    body: "Alexandria is your personal knowledge operating system — not a reading tracker, but a thinking system. It helps you read better, remember more, and actually use what you learn.",
    cta: "Tell me more",
  },
  {
    icon: "🔄",
    title: "How it works",
    body: "Every day, Alexandria shows you one next action. The Daily Protocol has six steps: Acquire (read), Capture (save ideas), Retrieve (test recall), Connect (link concepts), Apply (use knowledge), and Learn (complete a session).",
    cta: "Got it",
  },
  {
    icon: "🧠",
    title: "Spaced repetition",
    body: "When you save a highlight, capture an idea, or extract a principle, Alexandria schedules it for review at the optimal moment — just before you'd forget it. Testing yourself is 3× more effective than rereading.",
    cta: "Interesting",
  },
  {
    icon: "⚡",
    title: "Earn XP for real work",
    body: "You earn XP for completing reviews, learning sessions, applications, and captures — not for opening the app or running a timer. Progress tracks understanding, not usage.",
    cta: "Makes sense",
  },
  {
    icon: "🚀",
    title: "Start with your first book",
    body: "Everything flows from your actual reading. Open the Library, add the book you're working through right now, and Alexandria will start building your review queue automatically.",
    cta: "Open Library",
  },
];

export function Onboarding({ onDone, navigate }: { onDone: () => void; navigate: (s: AlexandriaSpace) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function advance() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(ONBOARDING_KEY, "1");
      dialogRef.current?.close();
      onDone();
      navigate("library");
    }
  }

  function skip() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    dialogRef.current?.close();
    onDone();
  }

  const current = STEPS[step];

  return (
    <dialog ref={dialogRef} className="onboarding-dialog" onClose={skip}>
      <div className="onboarding-body">
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot${i === step ? " active" : i < step ? " done" : ""}`} />
          ))}
        </div>
        <div className="onboarding-icon">{current.icon}</div>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-text">{current.body}</p>
        <div className="onboarding-actions">
          {step < STEPS.length - 1 && (
            <button className="ghost-btn" onClick={skip}>Skip intro</button>
          )}
          <button className="small-btn primary" onClick={advance}>{current.cta}</button>
        </div>
      </div>
    </dialog>
  );
}

export function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(ONBOARDING_KEY);
}
