import { getSettings } from "@/lib/settings-store";

export interface AIFeedbackRequest {
  /** What the exercise was (the passage, scenario, or challenge). */
  context: string;
  /** What the user was asked to do. */
  instruction: string;
  /** What the user actually wrote. */
  userResponse: string;
}

const SYSTEM_PROMPT =
  "You are a rigorous but encouraging Socratic tutor inside a personal-development app called Alexandria. " +
  "Give specific, concrete feedback on the user's reasoning: what's precise, what's borrowed language rather than " +
  "genuine understanding, what's missing, and one concrete way to sharpen it. Keep it under 150 words. Never invent " +
  "praise — if the response is weak, say so plainly and say why.";

function buildUserPrompt({ context, instruction, userResponse }: AIFeedbackRequest): string {
  return `Context: ${context}\n\nInstruction given to the user: ${instruction}\n\nThe user's response:\n${userResponse}`;
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
      max_tokens: 400,
    }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "The model returned no feedback.";
}

async function callAnthropic(apiKey: string, model: string, request: AIFeedbackRequest): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for the Anthropic API to accept a request originating from a browser page
      // rather than a server. The key is visible to this browser's devtools either way —
      // see the Settings page note about what that trade-off means for a static, backend-less app.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-5",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(request) }],
    }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  const data = await response.json();
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
