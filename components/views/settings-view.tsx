"use client";

import { useEffect, useState } from "react";
import { PageHeader, Rule } from "@/components/page-header";
import { getSettings, maskKey, saveSettings, type AIProvider, type AppSettings } from "@/lib/settings-store";
import { getAIFeedback } from "@/services/ai/browser-ai-client";

const PROVIDER_LABELS: Record<AIProvider, string> = { none: "None (offline only)", openai: "OpenAI (GPT)", anthropic: "Anthropic (Claude)" };
const MODEL_PLACEHOLDER: Record<AIProvider, string> = { none: "", openai: "e.g. gpt-4o-mini", anthropic: "e.g. claude-sonnet-5" };

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [keyDraft, setKeyDraft] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [modelDraft, setModelDraft] = useState(settings.aiModel);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setNotifPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  }, []);

  function saveKey() {
    setSettings(saveSettings({ aiApiKey: keyDraft.trim() }));
    setKeyDraft("");
    setEditingKey(false);
    setTestState("idle");
  }

  function saveModel() {
    setSettings(saveSettings({ aiModel: modelDraft.trim() }));
  }

  async function testConnection() {
    setTestState("testing"); setTestMessage("");
    try {
      const text = await getAIFeedback({ context: "Connection test.", instruction: "Reply with a single short sentence confirming you received this.", userResponse: "Hello from Alexandria." });
      setTestState("ok"); setTestMessage(text);
    } catch (error) {
      setTestState("error"); setTestMessage(error instanceof Error ? error.message : "Unknown error.");
    }
  }

  async function toggleNotifications(enabled: boolean) {
    if (enabled && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      setSettings(saveSettings({ notificationsEnabled: permission === "granted" }));
    } else {
      setSettings(saveSettings({ notificationsEnabled: false }));
    }
  }

  return <section className="view active"><div className="content">
    <PageHeader eyebrow="Configuration" title="Settings" intro="Alexandria works fully offline. Everything below is optional — additive functionality on top of a system that already runs without it." />

    <article className="card">
      <div className="kicker">AI feedback (optional)</div>
      <h2>Plug in your own OpenAI or Anthropic key</h2>
      <p className="meta top-gap">This app is a static site with no server. There is nowhere else for a key to live: it is stored only in this browser's local storage and sent directly from your browser to the provider you choose when you tap "Get AI feedback" inside an exercise. It never touches Alexandria's own servers — because there aren't any — but it is visible to anyone with devtools access on this device. Don't use a key you can't afford to have exposed on this machine.</p>
      <Rule />
      <div className="form-grid">
        <label>Provider<select value={settings.aiProvider} onChange={(e) => setSettings(saveSettings({ aiProvider: e.target.value as AIProvider }))}>
          {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((provider) => <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>)}
        </select></label>
        {settings.aiProvider !== "none" && <label>Model<input value={modelDraft} onChange={(e) => setModelDraft(e.target.value)} onBlur={saveModel} placeholder={MODEL_PLACEHOLDER[settings.aiProvider]} /></label>}
      </div>
      {settings.aiProvider !== "none" && <div className="top-gap">
        {!editingKey ? <div className="button-row">
          <span className="voice-note">API key: {settings.aiApiKey ? maskKey(settings.aiApiKey) : "not set"}</span>
          <button className="small-btn" onClick={() => setEditingKey(true)}>{settings.aiApiKey ? "Change key" : "Add key"}</button>
          {settings.aiApiKey && <button className="small-btn" onClick={() => setSettings(saveSettings({ aiApiKey: "" }))}>Remove key</button>}
        </div> : <div className="button-row">
          <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Paste your API key" className="search" />
          <button className="small-btn primary" onClick={saveKey} disabled={!keyDraft.trim()}>Save key</button>
          <button className="small-btn" onClick={() => { setEditingKey(false); setKeyDraft(""); }}>Cancel</button>
        </div>}
        {settings.aiApiKey && <div className="top-gap"><button className="small-btn" onClick={testConnection} disabled={testState === "testing"}>{testState === "testing" ? "Testing…" : "Test connection"}</button>
          {testState === "ok" && <p className="saved-note top-gap">Connected. Model replied: “{testMessage}”</p>}
          {testState === "error" && <p className="saved-note top-gap">{testMessage}</p>}
        </div>}
      </div>}
    </article>

    <article className="card top-gap">
      <div className="kicker">Reminders</div>
      <h2>Browser notifications</h2>
      <p className="meta top-gap">Best-effort only: this only fires while a tab is open somewhere on this device. There is no server to notify you when the app itself is closed.</p>
      <div className="button-row top-gap">
        <button className={`small-btn${settings.notificationsEnabled ? " primary" : ""}`} onClick={() => toggleNotifications(!settings.notificationsEnabled)} disabled={notifPermission === "unsupported"}>
          {settings.notificationsEnabled ? "Notifications on" : "Turn on notifications"}
        </button>
        {notifPermission === "unsupported" && <span className="voice-note">Not supported in this browser.</span>}
        {notifPermission === "denied" && <span className="voice-note">Blocked at the browser level — check your site settings.</span>}
      </div>
    </article>
  </div></section>;
}
