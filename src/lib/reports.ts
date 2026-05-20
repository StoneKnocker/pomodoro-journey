import type { PomodoroSession, Project, ReportType } from "./types";
import { isDateInRange, startOfLocalDay, toLocalDateKey } from "./time";

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
  projects: Project[]
): ProjectSummary[] {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const summaries = new Map<string, ProjectSummary>();

  for (const session of sessions) {
    const current =
      summaries.get(session.projectId) ??
      {
        projectId: session.projectId,
        projectName: projectNames.get(session.projectId) ?? "未命名项目",
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
  end: Date
): ReportSource {
  const weekSessions = getCompletedWorkSessionsInRange(sessions, start, end);
  return {
    type: "weekly",
    periodStart: start,
    periodEnd: end,
    sessions: weekSessions,
    summaries: summarizeSessions(weekSessions, projects)
  };
}

export function buildReportPrompt(source: ReportSource): string {
  const range = `${toLocalDateKey(source.periodStart)} 至 ${toLocalDateKey(source.periodEnd)}`;
  const totalMinutes = source.summaries.reduce((sum, item) => sum + item.minutes, 0);

  if (source.sessions.length === 0) {
    return `请生成一份简短中文周报。时间范围：${range}。没有完成的番茄钟记录，请如实说明无有效工作记录，并给出一句改进建议。`;
  }

  const lines = source.summaries.flatMap((summary) => [
    `项目：${summary.projectName}，${summary.minutes} 分钟，${summary.count} 个番茄钟。`,
    ...summary.notes.map((note) => `- ${note}`)
  ]);

  return [
    "请基于以下番茄钟记录生成一份中文工作周报。",
    `时间范围：${range}`,
    `总工作时间：${totalMinutes} 分钟`,
    "要求：按项目总结产出，保留具体事项，最后给出下一步建议。不要编造不存在的工作。",
    "记录：",
    ...lines
  ].join("\n");
}

export function createLocalReportContent(source: ReportSource): string {
  const totalMinutes = source.summaries.reduce((sum, item) => sum + item.minutes, 0);
  if (source.sessions.length === 0) {
    return "没有完成的番茄钟记录。";
  }

  return [
    `总工作时间：${totalMinutes} 分钟`,
    ...source.summaries.map((summary) => {
      const notes = summary.notes.length > 0 ? `\n${summary.notes.map((note) => `- ${note}`).join("\n")}` : "";
      return `${summary.projectName}：${summary.minutes} 分钟，${summary.count} 个番茄钟${notes}`;
    })
  ].join("\n\n");
}
