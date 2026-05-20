import type { AppData, AppSettings, PomodoroSession, Project } from "./types";
import { normalizeData } from "./storage";

const GIST_API = "https://api.github.com/gists";
const GIST_DESC = "pomodoro-journey-data";
const GIST_FILE = "pomodoro-journey-data.json";

interface RemotePayload {
  projects: Project[];
  sessions: PomodoroSession[];
  settings: Record<string, unknown>;
  lastDailyReportDate?: string;
  syncRevision: string;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json"
  };
}

function safeSettings(settings: AppSettings) {
  const { gist, ai: _ai, ...rest } = settings;
  return {
    ...rest,
    gist: { enabled: gist.enabled }
  };
}

export function serializeForSync(data: AppData): string {
  return JSON.stringify({
    projects: data.projects,
    sessions: data.sessions.filter((s) => s.type === "work" && s.status === "completed"),
    settings: safeSettings(data.settings),
    lastDailyReportDate: data.lastDailyReportDate,
    syncRevision: new Date().toISOString()
  });
}

async function findOrCreateGist(token: string): Promise<string> {
  const listRes = await fetch(`${GIST_API}?per_page=100`, {
    headers: authHeaders(token)
  });

  if (listRes.ok) {
    const gists = (await listRes.json()) as Array<{ id: string; description?: string }>;
    const found = gists.find((g) => g.description === GIST_DESC);
    if (found) {
      return found.id;
    }
  }

  const createRes = await fetch(GIST_API, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [GIST_FILE]: { content: "" } }
    })
  });

  if (!createRes.ok) {
    throw new Error(`创建 Gist 失败：${createRes.status}`);
  }

  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function pushToGist(token: string, gistId: string, content: string): Promise<string> {
  const res = await fetch(`${GIST_API}/${gistId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({
      description: GIST_DESC,
      files: { [GIST_FILE]: { content } }
    })
  });

  if (!res.ok) {
    throw new Error(`更新 Gist 失败：${res.status}`);
  }

  return new Date().toISOString();
}

async function pullFromGist(token: string, gistId: string): Promise<{ payload: RemotePayload } | null> {
  const res = await fetch(`${GIST_API}/${gistId}`, {
    headers: authHeaders(token)
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`读取 Gist 失败：${res.status}`);
  }

  const gist = (await res.json()) as {
    files?: Record<string, { content?: string }>;
  };

  const file = gist.files?.[GIST_FILE];
  if (!file?.content) return null;

  const payload = JSON.parse(file.content) as RemotePayload;
  if (!payload.syncRevision) return null;

  return { payload };
}

function mergeRemote(local: AppData, remote: RemotePayload): AppData {
  const localIds = new Set(local.projects.map((p) => p.id));
  const mergedProjects = [
    ...local.projects,
    ...remote.projects.filter((p) => !localIds.has(p.id))
  ];

  const localSessionIds = new Set(local.sessions.map((s) => s.id));
  const mergedSessions = [
    ...local.sessions,
    ...remote.sessions.filter((s) => !localSessionIds.has(s.id))
  ];

  const remoteNewer = !local.syncRevision || remote.syncRevision > local.syncRevision;

  return normalizeData({
    ...local,
    projects: mergedProjects,
    sessions: mergedSessions,
    settings: remoteNewer
      ? {
          ...(remote.settings as unknown as AppData["settings"]),
          gist: local.settings.gist,
          ai: local.settings.ai
        }
      : local.settings,
    lastDailyReportDate: remoteNewer
      ? (remote.lastDailyReportDate ?? local.lastDailyReportDate)
      : local.lastDailyReportDate,
    syncRevision: remote.syncRevision,
    lastSyncTime: new Date().toISOString()
  });
}

export async function performSync(data: AppData): Promise<AppData> {
  const { enabled, token, gistId } = data.settings.gist;
  if (!enabled || !token) return data;

  const effectiveGistId = gistId || (await findOrCreateGist(token));

  const remote = await pullFromGist(token, effectiveGistId);
  if (remote) {
    data = mergeRemote(data, remote.payload);
  }

  const content = serializeForSync(data);
  const syncRevision = await pushToGist(token, effectiveGistId, content);

  return {
    ...data,
    settings: {
      ...data.settings,
      gist: { ...data.settings.gist, gistId: effectiveGistId }
    },
    syncRevision,
    lastSyncTime: syncRevision
  };
}

export async function performPull(data: AppData): Promise<AppData> {
  const { enabled, token, gistId } = data.settings.gist;
  if (!enabled || !token || !gistId) return data;

  const result = await pullFromGist(token, gistId);
  if (!result) return data;

  return mergeRemote(data, result.payload);
}
