import type { CaptureDraft } from "@/models/domain";

export type AlexandriaSpace =
  // Primary nav (new names)
  | "home" | "library" | "learn" | "notes" | "review"
  // Knowledge nav
  | "knowledge-map" | "apply" | "tasks"
  // Track nav
  | "progress" | "gamepad" | "settings"
  // Legacy routes (all gated → new equivalents)
  | "atrium" | "path" | "halls" | "ledger" | "scriptorium" | "academy"
  | "interrogation" | "principles" | "agora" | "forum";

interface BrowserMCPContext {
  registerTool(tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations?: object;
    execute: (input: any) => unknown;
  }): void;
}

declare global {
  interface Document { modelContext?: BrowserMCPContext; }
}

export function registerBrowserTools(actions: {
  navigate: (space: AlexandriaSpace) => void;
  capture: (text: string, type: CaptureDraft["type"]) => CaptureDraft;
  startInterrogation: () => void;
}) {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  context.registerTool({
    name: "navigate_to_space",
    title: "Navigate Alexandria",
    description: "Open a named Alexandria space in the visible interface.",
    inputSchema: { type: "object", properties: { space: { type: "string" } }, required: ["space"], additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: ({ space }: { space: AlexandriaSpace }) => { actions.navigate(space); return { space }; },
  });

  context.registerTool({
    name: "capture_thought",
    title: "Capture a thought",
    description: "Preserve a thought in the local Alexandria capture inbox.",
    inputSchema: { type: "object", properties: { text: { type: "string", minLength: 1 }, type: { type: "string" } }, required: ["text", "type"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute: ({ text, type }: { text: string; type: CaptureDraft["type"] }) => actions.capture(text, type),
  });

  context.registerTool({
    name: "start_interrogation",
    title: "Open the Academy path",
    description: "Open the Academy at whatever step of the forced sequence the user has actually reached. Cannot jump ahead to a specific exercise.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: () => { actions.startInterrogation(); return { status: "opened" }; },
  });
}
