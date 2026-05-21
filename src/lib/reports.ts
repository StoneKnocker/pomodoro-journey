import type { PomodoroSession, Project, ReportType } from "./types";
import { isDateInRange, startOfLocalDay, toLocalDateKey } from "./time";
import type { Language } from "./i18n";
import { reportPrompt, reportEmptyPrompt, reportLocalHeader, reportLocalItem, t } from "./i18n";

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  minutes: number;
  count: number;
  notes: string[];
}

export interface ReportSource {
  type: ReportType;
  periodStart: Date;
  periodEnd: Date;
  sessions: PomodoroSession[];
  summaries: ProjectSummary[];
}

export function getCompletedWorkSessionsInRange(
  sessions: PomodoroSession[],
  start: Date,
  end: Date
): PomodoroSession[] {
  return sessions.filter(
    (session) =>
      session.type === "work" &&
      session.status === "completed" &&
      session.endedAt &&
      isDateInRange(session.endedAt, start, end)
  );
}

export function getCompletedWorkSessionsForDate(
  sessions: PomodoroSession[],
  dateKey: string
): PomodoroSession[] {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(startOfLocalDay(start).getTime() + 24 * 60 * 60 * 1000 - 1);
  return getCompletedWorkSessionsInRange(sessions, start, end);
}

export function summarizeSessions(
  sessions: PomodoroSession[],
  projects: Project[],
  lang?: Language
): ProjectSummary[] {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const summaries = new Map<string, ProjectSummary>();

  for (const session of sessions) {
    const current =
      summaries.get(session.projectId) ??
      {
        projectId: session.projectId,
        projectName: projectNames.get(session.projectId) ?? t("project.unnamed", lang ?? "en"),
        minutes: 0,
        count: 0,
        notes: []
      };

    current.minutes += session.durationMinutes;
    current.count += 1;
    if (session.note?.trim()) {
      current.notes.push(session.note.trim());
    }
    summaries.set(session.projectId, current);
  }

  return [...summaries.values()].sort((a, b) => b.minutes - a.minutes);
}

export function buildWeeklySource(
  sessions: PomodoroSession[],
  projects: Project[],
  start: Date,
  end: Date,
  lang?: Language
): ReportSource {
  const weekSessions = getCompletedWorkSessionsInRange(sessions, start, end);
  return {
    type: "weekly",
    periodStart: start,
    periodEnd: end,
    sessions: weekSessions,
    summaries: summarizeSessions(weekSessions, projects, lang)
  };
}

export function buildReportPrompt(source: ReportSource, lang: Language): string {
  const range = `${toLocalDateKey(source.periodStart)} — ${toLocalDateKey(source.periodEnd)}`;
  const totalMinutes = source.summaries.reduce((sum, item) => sum + item.minutes, 0);

  if (source.sessions.length === 0) {
    return reportEmptyPrompt(lang, range);
  }

  const lines = source.summaries.flatMap((summary) => [
    lang === "zh-CN"
      ? `项目：${summary.projectName}，${summary.minutes} 分钟，${summary.count} 个番茄钟。`
      : `Project: ${summary.projectName}, ${summary.minutes} min, ${summary.count} pomodoros.`,
    ...summary.notes.map((note) => `- ${note}`)
  ]);

  return reportPrompt(lang, range, totalMinutes, lines.join("\n"));
}

export function createLocalReportContent(source: ReportSource, lang: Language): string {
  const totalMinutes = source.summaries.reduce((sum, item) => sum + item.minutes, 0);
  if (source.sessions.length === 0) {
    return t("report.noSessions", lang);
  }

  return [
    reportLocalHeader(lang, totalMinutes),
    ...source.summaries.map((summary) => {
      const notes = summary.notes.length > 0 ? `\n${summary.notes.map((note) => `- ${note}`).join("\n")}` : "";
      return reportLocalItem(lang, summary.projectName, summary.minutes, summary.count, notes);
    })
  ].join("\n\n");
}
