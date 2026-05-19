import type { AppData, AppSettings, TimerState } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  workMinutes: 25,
  breakMinutes: 5,
  dailyReportHour: 9,
  ai: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini"
  },
  gist: {
    token: "",
    gistId: "",
    enabled: false
  }
};

export const DEFAULT_TIMER: TimerState = {
  mode: "idle"
};

export const DEFAULT_DATA: AppData = {
  projects: [],
  sessions: [],
  reports: [],
  timer: DEFAULT_TIMER,
  settings: DEFAULT_SETTINGS
};
