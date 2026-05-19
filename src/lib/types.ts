export type TimerMode = "idle" | "work" | "break" | "awaiting-confirmation";
export type SessionType = "work" | "break";
export type SessionStatus = "completed" | "interrupted";
export type ReportType = "daily" | "weekly";

export interface Project {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  archived?: boolean;
}

export interface PomodoroSession {
  id: string;
  projectId: string;
  initialProjectId?: string;
  type: SessionType;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  status: SessionStatus;
  note?: string;
}

export interface TimerDraft {
  id: string;
  type: SessionType;
  initialProjectId: string;
  projectId: string;
  startedAt: string;
  endsAt: string;
  durationMinutes: number;
}

export interface TimerState {
  mode: TimerMode;
  draft?: TimerDraft;
}

export interface Report {
  id: string;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  sourceSessionIds: string[];
  content: string;
}

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface GistConfig {
  token: string;
  gistId: string;
  enabled: boolean;
}

export interface AppSettings {
  workMinutes: number;
  breakMinutes: number;
  dailyReportHour: number;
  ai: AiConfig;
  gist: GistConfig;
}

export interface AppData {
  projects: Project[];
  sessions: PomodoroSession[];
  reports: Report[];
  timer: TimerState;
  settings: AppSettings;
  lastDailyReportDate?: string;
}

export type ClientMessage =
  | { type: "START_WORK"; projectId: string }
  | { type: "START_BREAK" }
  | { type: "COMPLETE_WORK"; projectId: string; note: string }
  | { type: "INTERRUPT_TIMER" }
  | { type: "GENERATE_DAILY_REPORT"; date?: string }
  | { type: "GENERATE_WEEKLY_REPORT" };
