import { Check, CirclePlus, Coffee, Pause, Play, Settings, Square } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createProject, loadData, saveData } from "../lib/storage";
import type { AppData, ClientMessage, Project } from "../lib/types";
import { DEFAULT_DATA } from "../lib/defaults";
import { formatRemainingMinutes, toLocalDateKey } from "../lib/time";
import { summarizeSessions, getCompletedWorkSessionsForDate } from "../lib/reports";

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

function getSecondsLeft(data: AppData): number {
  const draft = data.timer.draft;
  if (!draft) {
    return 0;
  }
  return Math.max(0, (new Date(draft.endsAt).getTime() - Date.now()) / 1000);
}

export function Popup() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [confirmProjectId, setConfirmProjectId] = useState("");
  const [note, setNote] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData().then((loaded) => {
      setData(loaded);
      setSelectedProjectId(loaded.projects.find((project) => !project.archived)?.id ?? "");
      setConfirmProjectId(loaded.timer.draft?.projectId ?? "");
      setSecondsLeft(getSecondsLeft(loaded));
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft(getSecondsLeft(data));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [data]);

  useEffect(() => {
    if (data.timer.mode === "awaiting-confirmation") {
      setConfirmProjectId(data.timer.draft?.projectId ?? selectedProjectId);
    }
  }, [data.timer.mode, data.timer.draft?.projectId, selectedProjectId]);

  const activeProjects = useMemo(() => data.projects.filter((project) => !project.archived), [data.projects]);
  const todaySessions = useMemo(
    () => getCompletedWorkSessionsForDate(data.sessions, toLocalDateKey(new Date())),
    [data.sessions]
  );
  const todaySummaries = useMemo(
    () => summarizeSessions(todaySessions, data.projects),
    [todaySessions, data.projects]
  );
  const totalMinutes = todaySummaries.reduce((sum, summary) => sum + summary.minutes, 0);

  async function runAction(action: () => Promise<AppData>) {
    setError("");
    try {
      setData(await action());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    }
  }

  async function addProject(event: FormEvent) {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) {
      return;
    }

    const project = createProject(name);
    const next = {
      ...data,
      projects: [...data.projects, project]
    };
    await saveData(next);
    setData(next);
    setSelectedProjectId(project.id);
    setNewProjectName("");
  }

  function projectName(projectId?: string): string {
    return data.projects.find((project) => project.id === projectId)?.name ?? "未选择项目";
  }

  const canStart = Boolean(selectedProjectId) && data.timer.mode === "idle";

  return (
    <main className="popup-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Pomodoro Journey</p>
          <h1>{data.timer.mode === "work" ? "专注中" : data.timer.mode === "break" ? "休息中" : "今日工作"}</h1>
        </div>
        <button className="icon-button" title="设置" onClick={() => chrome.runtime.openOptionsPage()}>
          <Settings size={18} />
        </button>
      </header>

      <section className="timer-panel">
        <div className="timer-value">
          {data.timer.mode === "awaiting-confirmation" ? "完成待确认" : formatRemainingMinutes(secondsLeft)}
        </div>
        <div className="timer-meta">
          {data.timer.mode === "work" && `项目：${projectName(data.timer.draft?.projectId)}`}
          {data.timer.mode === "break" && "休息结束后可开启下一个番茄钟"}
          {data.timer.mode === "idle" && `${totalMinutes} 分钟已完成`}
          {data.timer.mode === "awaiting-confirmation" && "修正项目和细节后保存"}
        </div>
      </section>

      {data.timer.mode === "awaiting-confirmation" ? (
        <section className="confirm-area">
          <label>
            项目
            <select value={confirmProjectId} onChange={(event) => setConfirmProjectId(event.target.value)}>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            细节
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="记录这次番茄钟完成了什么，可留空"
            />
          </label>
          <button
            className="primary-button"
            onClick={() =>
              runAction(async () => {
                const next = await sendMessage({ type: "COMPLETE_WORK", projectId: confirmProjectId, note });
                setNote("");
                return next;
              })
            }
          >
            <Check size={17} />
            保存记录
          </button>
        </section>
      ) : (
        <section className="action-area">
          <label>
            项目
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
              <option value="">选择项目</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <form className="project-form" onSubmit={addProject}>
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="新项目"
            />
            <button className="icon-button" title="新增项目" type="submit">
              <CirclePlus size={18} />
            </button>
          </form>

          <div className="button-row">
            <button
              className="primary-button"
              disabled={!canStart}
              onClick={() => runAction(() => sendMessage({ type: "START_WORK", projectId: selectedProjectId }))}
            >
              <Play size={17} />
              开始
            </button>
            <button
              disabled={data.timer.mode !== "idle"}
              onClick={() => runAction(() => sendMessage({ type: "START_BREAK" }))}
            >
              <Coffee size={17} />
              休息
            </button>
            <button
              disabled={data.timer.mode === "idle"}
              onClick={() => runAction(() => sendMessage({ type: "INTERRUPT_TIMER" }))}
            >
              {data.timer.mode === "work" ? <Square size={17} /> : <Pause size={17} />}
              中断
            </button>
          </div>
        </section>
      )}

      <section className="summary">
        <div className="summary-header">
          <span>今日统计</span>
          <strong>{totalMinutes} 分钟</strong>
        </div>
        {todaySummaries.length === 0 ? (
          <p className="empty">还没有完成的番茄钟。</p>
        ) : (
          <ul>
            {todaySummaries.map((summary) => (
              <li key={summary.projectId}>
                <span>{summary.projectName}</span>
                <strong>{summary.minutes} 分钟</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
