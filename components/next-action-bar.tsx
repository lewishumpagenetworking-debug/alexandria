"use client";

import { useEffect, useState } from "react";
import { getGrowthSummary } from "@/lib/growth-store";
import { getCurrentStep, STAGE_LABELS } from "@/lib/path-store";
import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

/** Mobile-only fixed bar so "what's next" is always one tap away, not just visible inside the Path screen. */
export function NextActionBar({ active, navigate }: { active: AlexandriaSpace; navigate: (space: AlexandriaSpace) => void }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const refresh = () => {
      const step = getCurrentStep();
      const growth = getGrowthSummary();
      const due = growth.dueRetrievals ? ` · ${growth.dueRetrievals} due` : "";
      setLabel(step ? `Continue: ${STAGE_LABELS[step.stage]}${due}` : `Today's path complete · ${growth.pointsToday} pts today`);
    };
    refresh();
    window.addEventListener("alexandria:data", refresh);
    return () => window.removeEventListener("alexandria:data", refresh);
  }, [active]);

  if (active === "learn" || active === "path") return null;

  return (
    <button className="next-action-bar" onClick={() => navigate("learn")}>
      <span className="next-action-label">{label}</span>
      <span className="next-action-arrow">→</span>
    </button>
  );
}
