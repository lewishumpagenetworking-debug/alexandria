import type { AlexandriaSpace } from "@/services/mcp/browser-tools";

export const spaceNames: Record<AlexandriaSpace, string> = {
  atrium: "The Atrium",
  library: "The Library",
  halls: "Halls of Knowledge",
  ledger: "Reading Ledger",
  scriptorium: "The Scriptorium",
  interrogation: "Interrogation Chamber",
  agora: "The Agora",
  forum: "The Forum",
  academy: "Academy · Capability Map",
};

const librarySpaces: Array<[AlexandriaSpace, string, string]> = [
  ["atrium", "◇", "The Atrium"],
  ["library", "▤", "Library"],
  ["halls", "Ⅱ", "Halls of Knowledge"],
  ["ledger", "◫", "Reading Ledger"],
  ["scriptorium", "✦", "Scriptorium"],
];

const academySpaces: Array<[AlexandriaSpace, string, string]> = [
  ["interrogation", "?", "Interrogation"],
  ["agora", "◎", "The Agora"],
  ["forum", "◉", "The Forum"],
  ["academy", "△", "Capability Map"],
];

export function Sidebar({ active, open, onNavigate, onCapture }: {
  active: AlexandriaSpace;
  open: boolean;
  onNavigate: (space: AlexandriaSpace) => void;
  onCapture: () => void;
}) {
  const group = (label: string, items: typeof librarySpaces) => (
    <>
      <div className="nav-label">{label}</div>
      {items.map(([id, sigil, title]) => (
        <button key={id} className={active === id ? "active" : ""} onClick={() => onNavigate(id)}>
          <span className="sigil">{sigil}</span>{title}
        </button>
      ))}
    </>
  );

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="brand"><div className="brand-mark">A</div><div><strong>ALEXANDRIA</strong><small>Library · Academy</small></div></div>
      <nav className="nav" aria-label="Primary navigation">
        {group("The Library", librarySpaces)}
        {group("The Academy", academySpaces)}
      </nav>
      <button className="capture-btn" onClick={onCapture}>＋ Capture a thought</button>
    </aside>
  );
}
