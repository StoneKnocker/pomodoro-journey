import { BarChart3, ChevronLeft, ChevronRight, Settings, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export function Stats() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadData().then((loaded) => {
      setData(loaded);
      setSelectedDay(toLocalDateKey(new Date()));
    });
  }, []);

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
        <h1>统计</h1>
      </header>

      <nav className="tabs">
        <a href="options.html" className="tab">
          <Settings size={15} />
          设置
        </a>
        <span className="tab tab--active">
          <BarChart3 size={15} />
          统计
        </span>
      </nav>

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
        <div className="report-header">
          <h2>最新报告</h2>
          <button type="button" onClick={generateWeeklyReport}>
            <Sparkles size={18} />
            生成上周周报
          </button>
        </div>
        {latestReport ? <pre>{latestReport.content}</pre> : <p>还没有报告。</p>}
        {status && <p className="status">{status}</p>}
      </section>
    </main>
  );
}
