import { getSettings } from "@/lib/settings-store";

export interface AIFeedbackRequest {
  context: string;
  instruction: string;
  userResponse: string;
}

export interface AIUsageSummary {
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

const USAGE_KEY = "alexandria-ai-usage-v1";
const MAX_CONTEXT_CHARS = 5000;
const MAX_INSTRUCTION_CHARS = 700;
const MAX_RESPONSE_CHARS = 3500;
const MAX_OUTPUT_TOKENS = 180;

const SYSTEM_PROMPT =
  "Socratic evaluator. Judge the user's reasoning against the supplied material. Be precise, not flattering. " +
  "Reply in at most 90 words using exactly: Verdict, Gap, Next. Do not restate the prompt.";

function clip(value: string, limit: number): string {
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.length <= limit ? clean : `${clean.slice(0, limit)}…`;
}

function buildUserPrompt({ context, instruction, userResponse }: AIFeedbackRequest): string {
  return `MATERIAL:\n${clip(context, MAX_CONTEXT_CHARS)}\nTASK:\n${clip(instruction, MAX_INSTRUCTION_CHARS)}\nANSWER:\n${clip(userResponse, MAX_RESPONSE_CHARS)}`;
}

function readUsage(): AIUsageSummary {
  if (typeof window === "undefined") return { requests: 0, inputTokens: 0, outputTokens: 0 };
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) || "null") ?? { requests: 0, inputTokens: 0, outputTokens: 0 };
  } catch {
    return { requests: 0, inputTokens: 0, outputTokens: 0 };
  }
}

function recordUsage(inputTokens = 0, outputTokens = 0) {
  if (typeof window === "undefined") return;
  const current = readUsage();
  const next = {
    requests: current.requests + 1,
    inputTokens: current.inputTokens + inputTokens,
    outputTokens: current.outputTokens + outputTokens,
  };
  localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("alexandria:ai-usage"));
}

export function getAIUsageSummary(): AIUsageSummary {
  return readUsage();
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message || `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

async function callOpenAI(apiKey: string, model: string, request: AIFeedbackRequest): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: buildUserPrompt(request) }],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  const data = await response.json();
  recordUsage(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0);
  return data.choices?.[0]?.message?.content?.trim() || "The model returned no feedback.";
}

async function callAnthropic(apiKey: string, model: string, request: AIFeedbackRequest): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-haiku-4-5",
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(request) }],
    }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  const data = await response.json();
  recordUsage(data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0);
  return data.content?.[0]?.text?.trim() || "The model returned no feedback.";
}

export async function getAIFeedback(request: AIFeedbackRequest): Promise<string> {
  const settings = getSettings();
  if (settings.aiProvider === "none" || !settings.aiApiKey.trim()) {
    throw new Error("No AI provider configured. Add an API key in Settings.");
  }
  if (settings.aiProvider === "openai") return callOpenAI(settings.aiApiKey.trim(), settings.aiModel.trim(), request);
  return callAnthropic(settings.aiApiKey.trim(), settings.aiModel.trim(), request);
}
