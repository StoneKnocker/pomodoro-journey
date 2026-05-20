import { ChevronLeft, ChevronRight, Download, FileText, RefreshCw, Save, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadData } from "../lib/storage";
import type { AppData, ClientMessage } from "../lib/types";
import { DEFAULT_DATA } from "../lib/defaults";
import { addDays, getWeekRange, toLocalDateKey } from "../lib/time";
import { getCompletedWorkSessionsForDate, summarizeSessions } from "../lib/reports";

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    loadData().then((loaded) => {
      setData(loaded);
      setSelectedDay(toLocalDateKey(new Date()));
    });
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    try {
      const next = await sendMessage({ type: "UPDATE_SETTINGS", settings: data.settings });
      setData(next);
      setStatus("设置已保存");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
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

  async function handleSyncNow() {
    setStatus("");
    try {
      const next = await sendMessage({ type: "SYNC_NOW" });
      setData(next);
      setStatus("同步完成");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  const weekRange = useMemo(() => {
    const ref = addDays(new Date(), weekOffset * 7);
    return getWeekRange(ref);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    const days: { dateKey: string; date: Date; sessions: ReturnType<typeof getCompletedWorkSessionsForDate> }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekRange.start, i);
      const dateKey = toLocalDateKey(date);
      days.push({
        dateKey,
        date,
        sessions: getCompletedWorkSessionsForDate(data.sessions, dateKey)
      });
    }
    return days;
  }, [data.sessions, weekRange]);

  const selectedDayStats = useMemo(() => {
    if (!selectedDay) return null;
    const daySessions = getCompletedWorkSessionsForDate(data.sessions, selectedDay);
    return summarizeSessions(daySessions, data.projects);
  }, [data.sessions, data.projects, selectedDay]);

  const todayKey = toLocalDateKey(new Date());
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
            启用 Gist 多设备同步
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
              placeholder="留空则自动发现或创建"
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
              <span>上次同步：{new Date(data.lastSyncTime).toLocaleString()}</span>
            ) : (
              <span className="sync-status--never">尚未同步</span>
            )}
            <button type="button" className="icon-button sync-button" title="立即同步" onClick={handleSyncNow}>
              <RefreshCw size={15} />
            </button>
          </div>
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

      <section className="weekly-stats">
        <div className="weekly-stats-header">
          <h2>每日统计</h2>
          <div className="week-nav">
            <button type="button" className="icon-button" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="week-label">
              {toLocalDateKey(weekRange.start)} — {toLocalDateKey(weekRange.end)}
            </span>
            <button type="button" className="icon-button" onClick={() => setWeekOffset((o) => o + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="week-grid">
          {weekDays.map((day) => {
            const totalMinutes = day.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
            const isToday = day.dateKey === todayKey;
            const isSelected = day.dateKey === selectedDay;

            return (
              <button
                key={day.dateKey}
                type="button"
                className={`day-cell${isToday ? " day-cell--today" : ""}${isSelected ? " day-cell--selected" : ""}`}
                onClick={() => setSelectedDay(day.dateKey)}
              >
                <span className="day-name">
                  {["一", "二", "三", "四", "五", "六", "日"][
                    (day.date.getDay() || 7) - 1
                  ]}
                </span>
                <span className="day-date">{day.dateKey.slice(5)}</span>
                {day.sessions.length > 0 ? (
                  <>
                    <span className="day-minutes">{totalMinutes} 分钟</span>
                    <span className="day-count">{day.sessions.length} 个番茄</span>
                  </>
                ) : (
                  <span className="day-empty">-</span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDayStats && (
          <div className="day-detail">
            <h3>{selectedDay} {selectedDay === todayKey ? "(今天)" : ""}</h3>
            {selectedDayStats.length === 0 ? (
              <p className="empty">没有完成的番茄钟。</p>
            ) : (
              <ul>
                {selectedDayStats.map((summary) => (
                  <li key={summary.projectId}>
                    <span>{summary.projectName}</span>
                    <strong>{summary.minutes} 分钟 · {summary.count} 个番茄钟</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="report-preview">
        <h2>最新报告</h2>
        {latestReport ? <pre>{latestReport.content}</pre> : <p>还没有报告。</p>}
      </section>
    </main>
  );
}
