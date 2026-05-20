import { performSync } from "./gist-sync";
import type { AppData, AppSettings, ClientMessage, PomodoroSession, Report } from "./types";
import { DEFAULT_SETTINGS } from "./defaults";
import { generateAiText, hasAiConfig } from "./ai";
import { buildDailySource, buildReportPrompt, buildWeeklySource, createLocalReportContent } from "./reports";
import { getPreviousNaturalWeek, getYesterdayKey } from "./time";

export function startWork(data: AppData, projectId: string, now = new Date()): AppData {
  const endsAt = new Date(now.getTime() + data.settings.workMinutes * 60 * 1000);
  return {
    ...data,
    timer: {
      mode: "work",
      draft: {
        id: crypto.randomUUID(),
        type: "work",
        initialProjectId: projectId,
        projectId,
        startedAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        durationMinutes: data.settings.workMinutes
      }
    }
  };
}

export function startBreak(data: AppData, now = new Date()): AppData {
  const projectId = data.projects[0]?.id ?? "break";
  const endsAt = new Date(now.getTime() + data.settings.breakMinutes * 60 * 1000);
  return {
    ...data,
    timer: {
      mode: "break",
      draft: {
        id: crypto.randomUUID(),
        type: "break",
        initialProjectId: projectId,
        projectId,
        startedAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        durationMinutes: data.settings.breakMinutes
      }
    }
  };
}

export function completeWork(data: AppData, projectId: string, note: string, now = new Date()): AppData {
  const draft = data.timer.draft;
  if (!draft || data.timer.mode !== "awaiting-confirmation") {
    return data;
  }

  const session: PomodoroSession = {
    id: draft.id,
    type: "work",
    projectId,
    initialProjectId: draft.initialProjectId,
    startedAt: draft.startedAt,
    endedAt: now.toISOString(),
    durationMinutes: draft.durationMinutes,
    status: "completed",
    note: note.trim() || undefined
  };

  return {
    ...data,
    sessions: [...data.sessions, session],
    timer: { mode: "idle" }
  };
}

export function interruptTimer(data: AppData, now = new Date()): AppData {
  const draft = data.timer.draft;
  if (!draft || data.timer.mode === "idle") {
    return { ...data, timer: { mode: "idle" } };
  }

  const session: PomodoroSession = {
    id: draft.id,
    type: draft.type,
    projectId: draft.projectId,
    initialProjectId: draft.initialProjectId,
    startedAt: draft.startedAt,
    endedAt: now.toISOString(),
    durationMinutes: Math.max(1, Math.round((now.getTime() - new Date(draft.startedAt).getTime()) / 60000)),
    status: "interrupted"
  };

  return {
    ...data,
    sessions: [...data.sessions, session],
    timer: { mode: "idle" }
  };
}

export function tickTimer(data: AppData, now = new Date()): AppData {
  const draft = data.timer.draft;
  if (!draft || data.timer.mode === "idle" || data.timer.mode === "awaiting-confirmation") {
    return data;
  }

  if (new Date(draft.endsAt).getTime() > now.getTime()) {
    return data;
  }

  if (draft.type === "break") {
    const session: PomodoroSession = {
      id: draft.id,
      type: "break",
      projectId: draft.projectId,
      initialProjectId: draft.initialProjectId,
      startedAt: draft.startedAt,
      endedAt: now.toISOString(),
      durationMinutes: draft.durationMinutes,
      status: "completed"
    };
    return {
      ...data,
      sessions: [...data.sessions, session],
      timer: { mode: "idle" }
    };
  }

  return {
    ...data,
    timer: {
      mode: "awaiting-confirmation",
      draft: {
        ...draft,
        endsAt: now.toISOString()
      }
    }
  };
}

async function generateReport(data: AppData, type: "daily" | "weekly", date?: string): Promise<AppData> {
  const source =
    type === "daily"
      ? buildDailySource(data.sessions, data.projects, date ?? getYesterdayKey())
      : buildWeeklySource(data.sessions, data.projects, getPreviousNaturalWeek().start, getPreviousNaturalWeek().end);
  const prompt = buildReportPrompt(source);
  const content = hasAiConfig(data.settings.ai)
    ? await generateAiText(data.settings.ai, prompt)
    : createLocalReportContent(source);

  const report: Report = {
    id: crypto.randomUUID(),
    type,
    periodStart: source.periodStart.toISOString(),
    periodEnd: source.periodEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    sourceSessionIds: source.sessions.map((session) => session.id),
    content
  };

  return {
    ...data,
    reports: [report, ...data.reports],
    lastDailyReportDate: type === "daily" ? date ?? getYesterdayKey() : data.lastDailyReportDate
  };
}

function createProject(data: AppData, name: string): AppData {
  const project = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString()
  };
  return {
    ...data,
    projects: [...data.projects, project]
  };
}

function updateSettings(data: AppData, settings: AppSettings): AppData {
  return {
    ...data,
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      ai: { ...DEFAULT_SETTINGS.ai, ...settings.ai },
      gist: { ...DEFAULT_SETTINGS.gist, ...settings.gist }
    }
  };
}

export async function handleClientMessage(data: AppData, message: ClientMessage): Promise<AppData> {
  switch (message.type) {
    case "START_WORK":
      return startWork(data, message.projectId);
    case "START_BREAK":
      return startBreak(data);
    case "COMPLETE_WORK":
      return completeWork(data, message.projectId, message.note);
    case "INTERRUPT_TIMER":
      return interruptTimer(data);
    case "CREATE_PROJECT":
      return createProject(data, message.name);
    case "UPDATE_SETTINGS":
      return updateSettings(data, message.settings);
    case "SYNC_NOW":
      return performSync(data);
    case "GENERATE_DAILY_REPORT":
      return generateReport(data, "daily", message.date);
    case "GENERATE_WEEKLY_REPORT":
      return generateReport(data, "weekly");
  }
}
