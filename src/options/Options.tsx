import { BarChart3, Download, RefreshCw, Save, Settings } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { loadData } from "../lib/storage";
import type { AppData, ClientMessage } from "../lib/types";
import { DEFAULT_DATA } from "../lib/defaults";
import { t, type Language } from "../lib/i18n";

interface RuntimeResponse {
  ok: boolean;
  data?: AppData;
  error?: string;
}

async function sendMessage(message: ClientMessage): Promise<AppData> {
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeResponse;
  if (!response.ok || !response.data) {
    throw new Error(response.error ?? "Operation failed");
  }
  return response.data;
}

export function Options() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadData().then(setData);
  }, []);

  const lang = data.settings.language as Language;
  const _ = (key: string, params?: Record<string, string | number>) => t(key, lang, params);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    try {
      const next = await sendMessage({ type: "UPDATE_SETTINGS", settings: data.settings });
      setData(next);
      setStatus(_("options.settingsSaved"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSyncNow() {
    setStatus("");
    try {
      const next = await sendMessage({ type: "SYNC_NOW" });
      setData(next);
      setStatus(_("options.syncComplete"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="options-shell">
      <header>
        <p>Pomodoro Journey</p>
        <h1>{_("options.title")}</h1>
      </header>

      <nav className="tabs">
        <span className="tab tab--active">
          <Settings size={15} />
          {_("options.title")}
        </span>
        <a href="stats.html" className="tab">
          <BarChart3 size={15} />
          {_("options.stats")}
        </a>
      </nav>

      <form onSubmit={saveSettings} className="settings-grid">
        <section>
          <h2>{_("options.timer")}</h2>
          <label>
            {_("options.workMinutes")}
            <input
              type="number"
              min="1"
              value={data.settings.workMinutes}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, workMinutes: Number(event.target.value) }
                })
              }
            />
          </label>
          <label>
            {_("options.breakMinutes")}
            <input
              type="number"
              min="1"
              value={data.settings.breakMinutes}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, breakMinutes: Number(event.target.value) }
                })
              }
            />
          </label>
          <label>
            {_("options.language")}
            <select
              value={data.settings.language}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, language: event.target.value }
                })
              }
            >
              <option value="en">English</option>
              <option value="zh-CN">中文</option>
            </select>
          </label>
        </section>

        <section>
          <h2>AI</h2>
          <label>
            Base URL
            <input
              value={data.settings.ai.baseUrl}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, ai: { ...data.settings.ai, baseUrl: event.target.value } }
                })
              }
            />
          </label>
          <label>
            API Key
            <input
              type="password"
              value={data.settings.ai.apiKey}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, ai: { ...data.settings.ai, apiKey: event.target.value } }
                })
              }
            />
          </label>
          <label>
            {_("options.model")}
            <input
              value={data.settings.ai.model}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, ai: { ...data.settings.ai, model: event.target.value } }
                })
              }
            />
          </label>
        </section>

        <section>
          <h2>Gist Sync</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={data.settings.gist.enabled}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, gist: { ...data.settings.gist, enabled: event.target.checked } }
                })
              }
            />
            {_("options.enableGist")}
          </label>
          <label>
            Token
            <input
              type="password"
              value={data.settings.gist.token}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, gist: { ...data.settings.gist, token: event.target.value } }
                })
              }
            />
          </label>
          <label>
            Gist ID
            <input
              value={data.settings.gist.gistId}
              placeholder={_("options.gistIdPlaceholder")}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, gist: { ...data.settings.gist, gistId: event.target.value } }
                })
              }
            />
          </label>
          <div className="sync-status">
            {data.lastSyncTime ? (
              <span>{_("options.lastSync")}{new Date(data.lastSyncTime).toLocaleString()}</span>
            ) : (
              <span className="sync-status--never">{_("options.neverSynced")}</span>
            )}
            <button type="button" className="icon-button sync-button" title={_("options.syncNow")} onClick={handleSyncNow}>
              <RefreshCw size={15} />
            </button>
          </div>
        </section>

        <div className="actions">
          <button className="primary-button" type="submit">
            <Save size={18} />
            {_("options.saveSettings")}
          </button>
          <button type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>
            <Download size={18} />
            {_("options.copyData")}
          </button>
        </div>
      </form>

      {status && <p className="status">{status}</p>}
    </main>
  );
}
