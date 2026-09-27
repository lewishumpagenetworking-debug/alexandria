"use client";

import { useEffect, useState } from "react";
import { PageHeader, Rule } from "@/components/page-header";
import { getSettings, maskKey, saveSettings, type AIProvider, type AppSettings } from "@/lib/settings-store";
import { getNotificationDiagnostics, sendAlexandriaNotification, type NotificationDiagnostics } from "@/lib/notification-engine";
import { getAIFeedback, getAIUsageSummary } from "@/services/ai/browser-ai-client";

const PROVIDER_LABELS: Record<AIProvider, string> = { none: "None (offline only)", openai: "OpenAI (GPT)", anthropic: "Anthropic (Claude)" };
const MODEL_PLACEHOLDER: Record<AIProvider, string> = { none: "", openai: "e.g. gpt-4o-mini", anthropic: "e.g. claude-haiku-4-5" };

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [keyDraft, setKeyDraft] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [modelDraft, setModelDraft] = useState(settings.aiModel);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [usage, setUsage] = useState(() => getAIUsageSummary());
  const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics>(() => getNotificationDiagnostics());
  const [notifTest, setNotifTest] = useState("");

  useEffect(() => {
    setNotifPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
    const refreshUsage = () => setUsage(getAIUsageSummary());
    const refreshNotifications = () => setDiagnostics(getNotificationDiagnostics());
    window.addEventListener("alexandria:ai-usage", refreshUsage);
    window.addEventListener("alexandria:notification-status", refreshNotifications);
    return () => {
      window.removeEventListener("alexandria:ai-usage", refreshUsage);
      window.removeEventListener("alexandria:notification-status", refreshNotifications);
    };
  }, []);

  function patchSettings(patch: Partial<AppSettings>) {
    const next = saveSettings(patch);
    setSettings(next);
    setDiagnostics(getNotificationDiagnostics());
    return next;
  }

  function saveKey() {
    patchSettings({ aiApiKey: keyDraft.trim() });
    setKeyDraft("");
    setEditingKey(false);
    setTestState("idle");
  }

  function saveModel() {
    patchSettings({ aiModel: modelDraft.trim() });
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
      patchSettings({ notificationsEnabled: permission === "granted" });
      setNotifTest(permission === "granted" ? "Permission granted. Use Test notification below to verify delivery." : "Permission was not granted.");
    } else {
      patchSettings({ notificationsEnabled: false });
    }
  }

  function testNotification() {
    const sent = sendAlexandriaNotification("Test successful. Alexandria can deliver browser notifications while it is active on this device.", "test");
    setNotifTest(sent ? "Test notification sent." : "Test failed. Check browser permission and notification settings.");
    setDiagnostics(getNotificationDiagnostics());
  }

  return <section className="view active"><div className="content">
    <PageHeader eyebrow="Configuration" title="Settings" intro="Alexandria works fully offline. Everything below is optional — additive functionality on top of a system that already runs without it." />

    <article className="card">
      <div className="kicker">AI feedback (optional)</div>
      <h2>Plug in your own OpenAI or Anthropic key</h2>
      <p className="meta top-gap">Alexandria keeps AI calls deliberately small: only the current material, task and your answer are sent, with hard input clipping and a short output cap. Routine Claude feedback defaults to Haiku 4.5 to minimise spend. This static build stores the key in this browser, so use a restricted project key with a low spending limit.</p>
      <Rule />
      <div className="form-grid">
        <label>Provider<select value={settings.aiProvider} onChange={(e) => patchSettings({ aiProvider: e.target.value as AIProvider })}>
          {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((provider) => <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>)}
        </select></label>
        {settings.aiProvider !== "none" && <label>Model<input value={modelDraft} onChange={(e) => setModelDraft(e.target.value)} onBlur={saveModel} placeholder={MODEL_PLACEHOLDER[settings.aiProvider]} /></label>}
      </div>
      {settings.aiProvider !== "none" && <><div className="feedback-grid top-gap"><article className="diag"><strong>{usage.requests}</strong><span>AI requests on this device</span></article><article className="diag"><strong>{usage.inputTokens.toLocaleString()}</strong><span>input tokens recorded</span></article><article className="diag"><strong>{usage.outputTokens.toLocaleString()}</strong><span>output tokens recorded</span></article></div><div className="top-gap">
        {!editingKey ? <div className="button-row">
          <span className="voice-note">API key: {settings.aiApiKey ? maskKey(settings.aiApiKey) : "not set"}</span>
          <button className="small-btn" onClick={() => setEditingKey(true)}>{settings.aiApiKey ? "Change key" : "Add key"}</button>
          {settings.aiApiKey && <button className="small-btn" onClick={() => patchSettings({ aiApiKey: "" })}>Remove key</button>}
        </div> : <div className="button-row">
          <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Paste your API key" className="search" />
          <button className="small-btn primary" onClick={saveKey} disabled={!keyDraft.trim()}>Save key</button>
          <button className="small-btn" onClick={() => { setEditingKey(false); setKeyDraft(""); }}>Cancel</button>
        </div>}
        {settings.aiApiKey && <div className="top-gap"><button className="small-btn" onClick={testConnection} disabled={testState === "testing"}>{testState === "testing" ? "Testing…" : "Test connection"}</button>
          {testState === "ok" && <p className="saved-note top-gap">Connected. Model replied: “{testMessage}”</p>}
          {testState === "error" && <p className="saved-note top-gap">{testMessage}</p>}
        </div>}
      </div></>}
    </article>

    <article className="card top-gap">
      <div className="kicker">Habit reminders</div>
      <h2>Reading and retention notifications</h2>
      <p className="meta top-gap">These reminders are state-aware: they react to whether you have read today, whether reviews are due, and whether a Read Instead sprint is unfinished. This static GitHub Pages build can send the 30-minute pulse while Alexandria is active and catch the scheduled morning/afternoon/evening windows when you reopen or resume it. A truly closed-app phone push still requires a push backend.</p>

      <div className="button-row top-gap">
        <button className={`small-btn${settings.notificationsEnabled ? " primary" : ""}`} onClick={() => toggleNotifications(!settings.notificationsEnabled)} disabled={notifPermission === "unsupported"}>
          {settings.notificationsEnabled ? "Notifications on" : "Turn on notifications"}
        </button>
        <button className="small-btn" onClick={testNotification} disabled={notifPermission !== "granted"}>Send test notification</button>
        {notifPermission === "unsupported" && <span className="voice-note">Not supported in this browser.</span>}
        {notifPermission === "denied" && <span className="voice-note">Blocked at browser/OS level. Re-enable notifications for this site in device settings.</span>}
      </div>
      {notifTest && <p className="saved-note top-gap">{notifTest}</p>}

      <Rule />

      <div className="reminder-grid">
        <label className="reminder-row">
          <span><strong>30-minute learning pulse</strong><small>While Alexandria is active, check in every half hour with the most relevant reading/review cue.</small></span>
          <input type="checkbox" checked={settings.reminderPulseEvery30} onChange={(e) => patchSettings({ reminderPulseEvery30: e.target.checked })} />
          <span className="voice-note">Every 30 min</span>
        </label>
        <label className="reminder-row">
          <span><strong>Morning reading cue</strong><small>Start with reading before habitual scrolling.</small></span>
          <input type="checkbox" checked={settings.reminderMorning} onChange={(e) => patchSettings({ reminderMorning: e.target.checked })} />
          <input type="time" value={settings.reminderMorningTime} onChange={(e) => patchSettings({ reminderMorningTime: e.target.value })} />
        </label>
        <label className="reminder-row">
          <span><strong>Afternoon replacement cue</strong><small>If no reading is logged, trade one scroll break for a short sprint.</small></span>
          <input type="checkbox" checked={settings.reminderAfternoon} onChange={(e) => patchSettings({ reminderAfternoon: e.target.checked })} />
          <input type="time" value={settings.reminderAfternoonTime} onChange={(e) => patchSettings({ reminderAfternoonTime: e.target.value })} />
        </label>
        <label className="reminder-row">
          <span><strong>Evening retention cue</strong><small>Close the day with reading or due retrievals.</small></span>
          <input type="checkbox" checked={settings.reminderEvening} onChange={(e) => patchSettings({ reminderEvening: e.target.checked })} />
          <input type="time" value={settings.reminderEveningTime} onChange={(e) => patchSettings({ reminderEveningTime: e.target.value })} />
        </label>
      </div>

      <div className="form-grid top-gap">
        <label>Quiet hours start<input type="time" value={settings.quietHoursStart} onChange={(e) => patchSettings({ quietHoursStart: e.target.value })} /></label>
        <label>Quiet hours end<input type="time" value={settings.quietHoursEnd} onChange={(e) => patchSettings({ quietHoursEnd: e.target.value })} /></label>
      </div>

      <Rule />

      <div className="feedback-grid">
        <article className="diag"><strong>{diagnostics.permission}</strong><span>browser permission</span></article>
        <article className="diag"><strong>{diagnostics.enabled ? "Enabled" : "Disabled"}</strong><span>Alexandria reminders</span></article>
        <article className="diag"><strong>{diagnostics.lastSentAt ? new Date(diagnostics.lastSentAt).toLocaleString() : "Never"}</strong><span>last notification sent</span></article>
        <article className="diag"><strong>{diagnostics.lastOpenedAt ? new Date(diagnostics.lastOpenedAt).toLocaleString() : "Never"}</strong><span>last notification opened</span></article>
      </div>
    </article>
  </div></section>;
}
