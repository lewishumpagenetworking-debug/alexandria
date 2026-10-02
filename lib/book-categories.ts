import { loadBooks } from "./application-store";
import { listFirstPrinciplesWork } from "./academy-store";
import { listCaptures } from "./capture-store";
import { listHighlights, listPrinciples } from "./library-notes-store";

export const BOOK_CATEGORIES = {
  general: "General reading", marketing: "Marketing", business: "Business", philosophy: "Philosophy",
  "great-leaders": "Great leaders", science: "Science", psychology: "Psychology",
} as const;
export type BookCategory = keyof typeof BOOK_CATEGORIES;
export function validCategory(value: unknown): value is BookCategory { return typeof value === "string" && Object.prototype.hasOwnProperty.call(BOOK_CATEGORIES, value); }
export function sourceCategory(sourceId?: string, title?: string): BookCategory {
  const books = loadBooks({ includeArchived: true, includeDeleted: true });
  const matches = sourceId ? books.filter(b => b.id === sourceId) : books.filter(b => b.title === title);
  return matches.length === 1 && validCategory(matches[0].category) ? matches[0].category : "general";
}
export function refCategory(ref?: { type: string; id: string; label: string }): BookCategory {
  if (!ref) return "general";
  if (ref.type === "capture") {
    const capture = listCaptures().find(c => c.id === ref.id);
    return sourceCategory(undefined, capture?.relatedBook || capture?.source || ref.label);
  }
  if (ref.type === "principle") {
    const principle = listPrinciples().find(p => p.id === ref.id);
    if (principle) {
      const categories = [...new Set(principle.sourceIds.map(id => sourceCategory(id)))];
      return categories.length === 1 ? categories[0] : "general";
    }
    const work = listFirstPrinciplesWork().find(w => w.id === ref.id);
    if (validCategory(work?.category)) return work.category;
  }
  const sourceId = ref.type === "highlight" ? listHighlights().find(h => h.id === ref.id)?.sourceId : ref.type === "principle" ? listPrinciples().find(p => p.id === ref.id)?.sourceIds[0] : undefined;
  return sourceCategory(sourceId, ref.label);
}
const PROFILES: Record<BookCategory, { claim: string; assumptions: string; evidence: string; mechanism: string; limits: string; action: string }> = {
  general: { claim: "the author's central claim", assumptions: "the conditions and definitions the claim depends on", evidence: "observations versus the author's interpretation", mechanism: "the causal or logical steps linking evidence to the conclusion", limits: "a counterexample or condition where the claim fails", action: "one concrete decision or behaviour" },
  marketing: { claim: "the claim about a customer's desire, belief or buying decision", assumptions: "the audience, awareness level, offer and channel assumptions", evidence: "customer language, behavioural evidence and conversion data versus persuasive rhetoric", mechanism: "how the message or offer changes belief and leads to action", limits: "a different audience, channel or awareness level where persuasion fails", action: "a specific message or offer test, predicted response and success metric" },
  business: { claim: "the claim about value creation, competitive advantage or operating performance", assumptions: "customer demand, costs, incentives, resources and market conditions", evidence: "cash flow, unit economics and observed customer behaviour versus a success anecdote", mechanism: "how the proposed decision changes value, cost, execution or incentives", limits: "a constraint, competitive response or market condition that breaks the model", action: "a concrete operating decision, trade-off, measurable result and downside limit" },
  philosophy: { claim: "the philosophical thesis and the meaning of its key terms", assumptions: "the premises, definitions and value judgments being assumed", evidence: "what is observed, logically inferred or asserted as a moral premise", mechanism: "the logical steps from premises to conclusion, including any hidden leap", limits: "a counterexample, conflicting principle or alternative interpretation", action: "a real judgment or ethical choice, and the reason that makes it defensible" },
  "great-leaders": { claim: "the leader's claim about power, command or decision-making in its historical context", assumptions: "the leader's incentives, institutions, available information and constraints", evidence: "documented actions and outcomes versus memoir, propaganda or hindsight", mechanism: "how the decision influenced people, resources or strategic outcomes", limits: "a historical counterexample or a condition that prevents modern transfer", action: "a present decision where the principle transfers, with the contextual differences stated" },
  science: { claim: "the testable hypothesis and the quantities it predicts", assumptions: "the model assumptions, measurements and experimental conditions", evidence: "measurements and reproducible observations versus inference", mechanism: "the physical or causal mechanism and the predictions it produces", limits: "a falsifying result, uncertainty or boundary of the model", action: "a feasible experiment, observable prediction and falsification criterion" },
  psychology: { claim: "the claim about cognition, emotion or behaviour", assumptions: "the population, context and proposed psychological process", evidence: "observed behaviour and study findings versus anecdote or self-report", mechanism: "how the proposed process changes behaviour, including alternative explanations", limits: "an individual difference, context or confound that weakens the claim", action: "an ethical behavioural test, expected change and observable outcome" },
};
export function categoryLens(category: BookCategory): string {
  const p = PROFILES[category];
  return `Study area: ${BOOK_CATEGORIES[category]}. Examine ${p.claim}; test ${p.assumptions}; distinguish ${p.evidence}; trace ${p.mechanism}; check ${p.limits}; propose ${p.action}. Use the supplied passage as evidence. Do not assume the claim is true, force an irrelevant theme, invent a scholar or claim source support that is absent.`;
}
export function categoryQuestions(category: BookCategory): string[] {
  const p = PROFILES[category];
  return [`In your own words, what is ${p.claim}? Which exact words in this passage support your reading?`, `What must be true about ${p.assumptions} for the claim to hold?`, `What is established by ${p.evidence}, and what remains assumed?`, `Strip away analogy and reputation. What minimum facts or premises support ${p.claim}?`, `Rebuild the argument: explain ${p.mechanism} without borrowing the author's wording.`, `Where does the claim stop working? Give ${p.limits}.`, `How would you use this idea? Specify ${p.action}, and explain why the passage supports it.`];
}
export function categoryStages(category: BookCategory): Array<[string, string]> {
  const p = PROFILES[category];
  return [["Statement", `State ${p.claim}.`], ["Assumptions", `Identify ${p.assumptions}. Which can you defend?`], ["Observations", `Separate ${p.evidence}. What does the passage actually establish?`], ["Fundamental truths", `Which definitions, constraints or supported facts are essential? Trace ${p.mechanism}.`], ["Reduction", "Remove analogy, reputation and unnecessary assumptions. What minimum argument remains?"], ["Reconstruction", `From those foundations, reconstruct ${p.mechanism}. What conclusion follows?`], ["Boundary conditions", `Give ${p.limits}.`], ["Application", `Specify ${p.action}. What result would make you revise your view?`]];
}
