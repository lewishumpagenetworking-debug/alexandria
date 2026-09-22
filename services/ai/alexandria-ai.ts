import type { AlexandriaAIService } from "./contracts";

const endpoint = () => process.env.NEXT_PUBLIC_ALEXANDRIA_AI_ENDPOINT?.trim() || "";

export function isAlexandriaAIConfigured() {
  return Boolean(endpoint());
}

async function callAI<T>(action: string, payload: unknown): Promise<T> {
  const url = endpoint();
  if (!url) throw new Error("Alexandria AI backend is not configured.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!response.ok) throw new Error(`Alexandria AI request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

/**
 * Browser-safe AI client. The OpenAI key must live behind
 * NEXT_PUBLIC_ALEXANDRIA_AI_ENDPOINT on a private server/serverless function.
 * Never put an OpenAI key in the GitHub Pages bundle.
 */
export const alexandriaAI: AlexandriaAIService = {
  searchLibrary(query) { return callAI("searchLibrary", { query }); },
  semanticSearch(query) { return callAI("semanticSearch", { query }); },
  createSocraticQuestions(sourceId) { return callAI("createSocraticQuestions", { sourceId }); },
  reduceToFirstPrinciples(text) { return callAI("reduceToFirstPrinciples", { text }); },
  synthesiseKnowledge(entityIds) { return callAI("synthesiseKnowledge", { entityIds }); },
  generateAgoraScenario(context) { return callAI("generateAgoraScenario", { context }); },
  analyseForumResponse(session) { return callAI("analyseForumResponse", { session }); },
  extractTranscript(transcript) { return callAI("extractTranscript", { transcript }); },
  createKnowledgeRecord(input) { return callAI("createKnowledgeRecord", { input }); },
};
