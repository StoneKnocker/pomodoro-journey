import { DEFAULT_DATA, DEFAULT_SETTINGS, DEFAULT_TIMER } from "./defaults";
import type { AppData, AppSettings, Project } from "./types";

const STORAGE_KEY = "pomodoroJourney";

function chromeStorageAvailable(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

function mergeSettings(settings?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    ai: {
      ...DEFAULT_SETTINGS.ai,
      ...settings?.ai
    },
    gist: {
      ...DEFAULT_SETTINGS.gist,
      ...settings?.gist
    }
  };
}

export function normalizeData(data?: Partial<AppData>): AppData {
  return {
    ...DEFAULT_DATA,
    ...data,
    projects: data?.projects ?? DEFAULT_DATA.projects,
    sessions: data?.sessions ?? DEFAULT_DATA.sessions,
    reports: data?.reports ?? DEFAULT_DATA.reports,
    timer: data?.timer ?? DEFAULT_TIMER,
    settings: mergeSettings(data?.settings)
  };
}

export async function loadData(): Promise<AppData> {
  if (!chromeStorageAvailable()) {
    return normalizeData();
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeData(result[STORAGE_KEY] as Partial<AppData> | undefined);
}

export async function saveData(data: AppData): Promise<void> {
  if (!chromeStorageAvailable()) {
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: normalizeData(data) });
}

export async function updateData(mutator: (data: AppData) => AppData | Promise<AppData>): Promise<AppData> {
  const current = await loadData();
  const next = normalizeData(await mutator(current));
  await saveData(next);
  return next;
}

export function createProject(name: string): Project {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString()
  };
}
