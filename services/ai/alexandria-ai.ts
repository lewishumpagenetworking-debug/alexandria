import type { AlexandriaAIService } from "./contracts";

/**
 * Replace this placeholder with a server-only implementation in app/api.
 * Keeping the interface here prevents React components from depending on a
 * particular AI provider or leaking credentials into the browser bundle.
 */
export const alexandriaAI: AlexandriaAIService = {
  async searchLibrary() { return []; },
  async semanticSearch() { return []; },
  async createSocraticQuestions() { return []; },
  async reduceToFirstPrinciples() { return []; },
  async synthesiseKnowledge() { return ""; },
  async generateAgoraScenario() { throw new Error("AI service is not configured."); },
  async analyseForumResponse() { return []; },
  async extractTranscript() { return { interpretations: [], principles: [], connections: [] }; },
  async createKnowledgeRecord() { throw new Error("AI service is not configured."); },
};
