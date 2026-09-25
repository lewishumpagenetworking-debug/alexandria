import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

export const spaceNames: Record<AlexandriaSpace, string> = {
  home: "Home",
  library: "Library",
  learn: "Learn",
  notes: "Ideas & Notes",
  review: "Review",
  "knowledge-map": "Knowledge Map",
  apply: "Apply",
  tasks: "Tasks",
  progress: "Progress",
  gamepad: "Game Pad",
  settings: "Settings",
  // Legacy gated routes
  atrium: "Home",
  path: "Learn",
  halls: "Knowledge Map",
  ledger: "Library",
  scriptorium: "Ideas & Notes",
  academy: "Progress",
  interrogation: "Learn",
  principles: "Learn",
  agora: "Learn",
  forum: "Learn",
};

const dailySpaces: Array<[AlexandriaSpace, string, string]> = [
  ["home", "⌂", "Home"],
  ["library", "▤", "Library"],
  ["learn", "→", "Learn"],
  ["notes", "✦", "Ideas & Notes"],
  ["review", "↺", "Review"],
];

const knowledgeSpaces: Array<[AlexandriaSpace, string, string]> = [
  ["knowledge-map", "Ⅱ", "Knowledge Map"],
  ["apply", "◉", "Apply"],
  ["tasks", "☐", "Tasks"],
];

const trackSpaces: Array<[AlexandriaSpace, string, string]> = [
  ["progress", "◇", "Progress"],
  ["gamepad", "▶", "Game Pad"],
];

export function Sidebar({ active, open, onNavigate, onCapture }: {
  active: AlexandriaSpace;
  open: boolean;
  onNavigate: (space: AlexandriaSpace) => void;
  onCapture: () => void;
}) {
  const effectiveActive = (active === "atrium" ? "home" : active === "path" ? "learn" : active === "halls" ? "knowledge-map" : active === "ledger" ? "library" : active === "scriptorium" ? "notes" : active === "academy" ? "progress" : active) as AlexandriaSpace;

  const group = (label: string, items: typeof dailySpaces) => (
    <>
      <div className="nav-label">{label}</div>
      {items.map(([id, sigil, title]) => (
        <button key={id} className={effectiveActive === id ? "active" : ""} onClick={() => onNavigate(id)}>
          <span className="sigil">{sigil}</span>{title}
        </button>
      ))}
    </>
  );

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="brand"><div className="brand-mark">A</div><div><strong>ALEXANDRIA</strong><small>Knowledge OS</small></div></div>
      <nav className="nav" aria-label="Primary navigation">
        {group("Daily", dailySpaces)}
        {group("Knowledge", knowledgeSpaces)}
        {group("Track", trackSpaces)}
      </nav>
      <button className="capture-btn" onClick={onCapture}>＋ Capture idea</button>
      <button className={`settings-btn${effectiveActive === "settings" ? " active" : ""}`} onClick={() => onNavigate("settings")}><span className="sigil">⚙</span>Settings</button>
    </aside>
  );
}
