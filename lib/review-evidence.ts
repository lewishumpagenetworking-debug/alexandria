import { getInterpretationsForHighlight, getPrinciplesForHighlight, listPrinciples } from "@/lib/library-notes-store";
import type { RetrievalCard } from "@/lib/retrieval-store";

export interface ReviewEvidence {
  diagnosis: string;
  scholarName?: string;
  scholarBasis?: string;
  scholarSourceTitle?: string;
  scholarSourceUrl?: string;
  scholarConfidence: "direct" | "contextual" | "none";
}

type ScholarRule = {
  test: RegExp;
  basis: string;
  sourceTitle: string;
  sourceUrl: string;
  confidence: "direct" | "contextual";
};

const ROBERTS_LIFE = "https://www.andrew-roberts.net/books/napoleon-a-life/";
const ROBERTS_GREAT = "https://www.andrew-roberts.net/books/napoleon-the-great/";
const ROBERTS_WELLINGTON = "https://www.andrew-roberts.net/books/napoleon-wellington/";
const ROBERTS_MARSHALS = "https://www.andrew-roberts.net/books/napoleon-his-marshals/";

const NAPOLEON_RULES: ScholarRule[] = [
  {
    test: /(men are nothing|one man is everything|judge men|results of their actions|friendship|deceiving those|master their passions|loyalty|governors|asking questions)/i,
    basis: "In Napoleon & His Marshals, Andrew Roberts emphasizes both Napoleon's inspiring leadership and the darker cost of manipulating and controlling the commanders whose loyalty he depended on. That supports reading this passage through the tension between instrumental judgments of people, command effectiveness, and the fragility of loyalty.",
    sourceTitle: "Napoleon & His Marshals",
    sourceUrl: ROBERTS_MARSHALS,
    confidence: "contextual",
  },
  {
    test: /(tell them|newspapers|history|imagination rules|impress them|public opinion|reputation|fear me|world begged|crown of france|great man)/i,
    basis: "Andrew Roberts emphasizes that Napoleon understood the strategic importance of controlling his own story. Roberts treats Napoleon's memoir-making and public self-presentation as part of his political method, so this passage is useful evidence of Napoleon thinking about perception as an instrument of power.",
    sourceTitle: "Napoleon: A Life",
    sourceUrl: ROBERTS_LIFE,
    confidence: "contextual",
  },
  {
    test: /(calculus|planning|genius|possibilities|accident|campaign|battlefield|offensive|defensive|boldness|speed|dare|opportunity|fortune|simple moves|success)/i,
    basis: "Roberts presents Napoleon as an unusually decisive military and political operator, and his work on Napoleon and Wellington repeatedly stresses calculation, boldness, speed, rivalry and the ability to convert opportunity into action. This supports reading the passage as part of Napoleon's decision-making doctrine rather than as a detached aphorism.",
    sourceTitle: "Napoleon: A Life; Napoleon & Wellington",
    sourceUrl: ROBERTS_WELLINGTON,
    confidence: "contextual",
  },
  {
    test: /(schools|educated|ignorance|law|state|government|society|politics|ruler|govern|empire|civil|founding|founded)/i,
    basis: "Roberts argues that Napoleon should be understood not only as a conqueror but as a constructive ruler whose peacetime state-building and civic reforms mattered deeply. This makes the passage relevant to Napoleon's conception of government, institutions and administrative power.",
    sourceTitle: "Napoleon the Great",
    sourceUrl: ROBERTS_GREAT,
    confidence: "contextual",
  },
  {
    test: /(wellington|waterloo|enemy|rival|ruthless|victory|defeated|conquest)/i,
    basis: "In his study of Napoleon and Wellington, Roberts frames their relationship through rivalry, propaganda, pride, ruthlessness and changing judgments of military ability. This passage can therefore be read within Napoleon's competitive habit of evaluating power through victory, reputation and comparative command.",
    sourceTitle: "Napoleon & Wellington",
    sourceUrl: ROBERTS_WELLINGTON,
    confidence: "contextual",
  },
  {
    test: /(will|nothing will stop me|made up my mind|everything is forgotten|love power|artist|two years ahead)/i,
    basis: "Roberts characterizes Napoleon as decisive, highly energetic and capable of extraordinary concentration across military and political problems. That broader portrait supports interpreting this passage as evidence of deliberate will, focus and executive intensity.",
    sourceTitle: "Napoleon: A Life",
    sourceUrl: ROBERTS_LIFE,
    confidence: "contextual",
  },
];

function napoleonScholarContext(card: RetrievalCard): Omit<ReviewEvidence, "diagnosis"> | null {
  if (!/mind of napoleon/i.test(card.label)) return null;
  const rule = NAPOLEON_RULES.find((candidate) => candidate.test.test(card.text));
  if (!rule) return null;
  return {
    scholarName: "Andrew Roberts",
    scholarBasis: rule.basis,
    scholarSourceTitle: rule.sourceTitle,
    scholarSourceUrl: rule.sourceUrl,
    scholarConfidence: rule.confidence,
  };
}

export function getReviewEvidence(card: RetrievalCard): ReviewEvidence {
  if (card.refType === "highlight") {
    const interpretation = getInterpretationsForHighlight(card.refId)[0];
    const linkedPrinciple = getPrinciplesForHighlight(card.refId)[0];
    const importedScholar = interpretation?.scholarName || interpretation?.scholarBasis
      ? {
          scholarName: interpretation.scholarName,
          scholarBasis: interpretation.scholarBasis,
          scholarSourceTitle: interpretation.scholarSourceTitle,
          scholarSourceUrl: interpretation.scholarSourceUrl,
          scholarConfidence: interpretation.scholarConfidence ?? "contextual" as const,
        }
      : null;
    const retrofit = napoleonScholarContext(card);

    return {
      diagnosis: interpretation?.text
        || linkedPrinciple?.explanation
        || linkedPrinciple?.statement
        || "Alexandria does not yet have a stored interpretation for this passage. Treat the source itself as primary evidence and add an interpretation during the next import/edit cycle.",
      ...(importedScholar ?? retrofit ?? {}),
      scholarConfidence: importedScholar?.scholarConfidence ?? retrofit?.scholarConfidence ?? "none",
    };
  }

  if (card.refType === "principle") {
    const principle = listPrinciples().find((item) => item.id === card.refId);
    return {
      diagnosis: principle?.explanation || principle?.statement || card.text,
      scholarConfidence: "none",
    };
  }

  return {
    diagnosis: card.text,
    scholarConfidence: "none",
  };
}
