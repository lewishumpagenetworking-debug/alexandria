import type { InputSource } from "@/models/domain";

export interface VoiceTextPayload {
  text: string;
  inputSource: Extract<InputSource, "dictation">;
  capturedAt: string;
  confidence?: number;
}

/**
 * Wispr Flow and browser speech-to-text can write into the existing textareas
 * today. A future adapter can emit this shape without changing page components.
 */
export interface VoiceInputAdapter {
  isAvailable(): boolean;
  start(): Promise<void>;
  stop(): Promise<VoiceTextPayload>;
}
