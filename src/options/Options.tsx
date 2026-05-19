import { Download, Save, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { loadData, saveData } from "../lib/storage";
import type { AppData, ClientMessage } from "../lib/types";
import { DEFAULT_DATA } from "../lib/defaults";

interface RuntimeResponse {
  ok: boolean;
  data?: AppData;
  error?: string;
}

async function sendMessage(message: ClientMessage): Promise<AppData> {
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeResponse;
  if (!response.ok || !response.data) {
    throw new Error(response.error ?? "操作失败");
  }
  return response.data;
}

export function Options() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadData().then(setData);
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await saveData(data);
    setStatus("设置已保存");
  }

  async function generateWeeklyReport() {
    setStatus("");
    try {
      const next = await sendMessage({ type: "GENERATE_WEEKLY_REPORT" });
      setData(next);
      setStatus("周报已生成");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  const latestReport = data.reports[0];

  return (
    <main className="options-shell">
      <header>
        <p>Pomodoro Journey</p>
        <h1>设置</h1>
      </header>

      <form onSubmit={saveSettings} className="settings-grid">
        <section>
          <h2>计时</h2>
          <label>
            工作分钟
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
            休息分钟
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
            日报补生成小时
            <input
              type="number"
              min="0"
              max="23"
              value={data.settings.dailyReportHour}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, dailyReportHour: Number(event.target.value) }
                })
              }
            />
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
            模型
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
          <h2>Gist 同步</h2>
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
            启用预留配置
          </label>
          <label>
            Gist ID
            <input
              value={data.settings.gist.gistId}
              onChange={(event) =>
                setData({
                  ...data,
                  settings: { ...data.settings, gist: { ...data.settings.gist, gistId: event.target.value } }
                })
              }
            />
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
        </section>

        <div className="actions">
          <button className="primary-button" type="submit">
            <Save size={18} />
            保存设置
          </button>
          <button type="button" onClick={generateWeeklyReport}>
            <Sparkles size={18} />
            生成上周周报
          </button>
          <button type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>
            <Download size={18} />
            复制数据
          </button>
        </div>
      </form>

      {status && <p className="status">{status}</p>}

      <section className="report-preview">
        <h2>最新报告</h2>
        {latestReport ? <pre>{latestReport.content}</pre> : <p>还没有报告。</p>}
      </section>
    </main>
  );
}
