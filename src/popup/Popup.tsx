import { Check, CirclePlus, Coffee, Pause, Play, Settings, Square } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadData } from "../lib/storage";
import type { AppData, ClientMessage, PomodoroSession, Project } from "../lib/types";
import { DEFAULT_DATA } from "../lib/defaults";
import { formatTimer, toLocalDateKey } from "../lib/time";
import { summarizeSessions, getCompletedWorkSessionsForDate } from "../lib/reports";
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

function findLastWorkSession(sessions: PomodoroSession[]): PomodoroSession | undefined {
  return sessions
    .filter((s) => s.type === "work")
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
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
      const lastSession = findLastWorkSession(loaded.sessions);
      setSelectedProjectId(
        lastSession?.projectId ?? loaded.projects.find((project) => !project.archived)?.id ?? ""
      );
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

  const lang = data.settings.language as Language;
  const _ = (key: string, params?: Record<string, string | number>) => t(key, lang, params);

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

    setError("");
    try {
      const next = await sendMessage({ type: "CREATE_PROJECT", name });
      setData(next);
      const created = next.projects[next.projects.length - 1];
      setSelectedProjectId(created.id);
      setNewProjectName("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    }
  }

  function projectName(projectId?: string): string {
    return data.projects.find((project) => project.id === projectId)?.name ?? _("project.unselected");
  }

  async function confirmWork() {
    await runAction(async () => {
      const next = await sendMessage({ type: "COMPLETE_WORK", projectId: confirmProjectId, note });
      setNote("");
      return next;
    });
  }

  const canStart = Boolean(selectedProjectId) && data.timer.mode === "idle";

  return (
    <main className="popup-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Pomodoro Journey</p>
          <h1>{data.timer.mode === "work" ? _("popup.focusing") : data.timer.mode === "break" ? _("popup.onBreak") : _("popup.todayWork")}</h1>
        </div>
        <button className="icon-button" title={_("popup.settings")} onClick={() => chrome.runtime.openOptionsPage()}>
          <Settings size={18} />
        </button>
      </header>

      <section className="timer-panel">
        <div className="timer-value">
          {data.timer.mode === "awaiting-confirmation" ? _("popup.awaitingConfirm") : formatTimer(secondsLeft)}
        </div>
        <div className="timer-meta">
          {data.timer.mode === "work" && `${_("popup.projectColon")}${projectName(data.timer.draft?.projectId)}`}
          {data.timer.mode === "break" && _("popup.breakHint")}
          {data.timer.mode === "idle" && _("popup.idleHint", { n: totalMinutes })}
          {data.timer.mode === "awaiting-confirmation" && _("popup.confirmHint")}
        </div>
      </section>

      {data.timer.mode === "awaiting-confirmation" ? (
        <section className="confirm-area">
          <label>
            {_("popup.project")}
            <select value={confirmProjectId} onChange={(event) => setConfirmProjectId(event.target.value)}>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {_("popup.detail")}
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === "Enter") confirmWork();
              }}
              placeholder={_("popup.notePlaceholder")}
            />
          </label>
          <button
            className="primary-button"
            onClick={confirmWork}
          >
            <Check size={17} />
            {_("popup.saveRecord")}
          </button>
        </section>
      ) : (
        <section className="action-area">
          <label>
            {_("popup.project")}
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
              <option value="">{_("popup.selectProject")}</option>
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
              placeholder={_("popup.newProject")}
            />
            <button className="icon-button" title={_("popup.addProject")} type="submit">
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
              {_("popup.start")}
            </button>
            <button
              disabled={data.timer.mode !== "idle"}
              onClick={() => runAction(() => sendMessage({ type: "START_BREAK" }))}
            >
              <Coffee size={17} />
              {_("popup.break")}
            </button>
            <button
              disabled={data.timer.mode === "idle"}
              onClick={() => runAction(() => sendMessage({ type: "INTERRUPT_TIMER" }))}
            >
              {data.timer.mode === "work" ? <Square size={17} /> : <Pause size={17} />}
              {_("popup.interrupt")}
            </button>
          </div>
        </section>
      )}

      <section className="summary">
        <div className="summary-header">
          <span>{_("popup.todayStats")}</span>
          <strong>{totalMinutes} {_("popup.minutes")}</strong>
        </div>
        {todaySummaries.length === 0 ? (
          <p className="empty">{_("popup.noSessions")}</p>
        ) : (
          <ul>
            {todaySummaries.map((summary) => (
              <li key={summary.projectId}>
                <span>{summary.projectName}</span>
                <strong>{summary.minutes} {_("popup.minutes")}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
