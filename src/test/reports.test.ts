import { describe, expect, it } from "vitest";
import { buildDailySource, buildReportPrompt, summarizeSessions } from "../lib/reports";
import type { PomodoroSession, Project } from "../lib/types";

const projects: Project[] = [
  {
    id: "project-a",
    name: "插件开发",
    createdAt: "2026-05-18T00:00:00.000Z"
  },
  {
    id: "project-b",
    name: "产品设计",
    createdAt: "2026-05-18T00:00:00.000Z"
  }
];

const sessions: PomodoroSession[] = [
  {
    id: "session-1",
    type: "work",
    projectId: "project-b",
    initialProjectId: "project-a",
    startedAt: "2026-05-18T01:00:00.000Z",
    endedAt: "2026-05-18T01:25:00.000Z",
    durationMinutes: 25,
    status: "completed",
    note: "修正需求"
  },
  {
    id: "session-2",
    type: "work",
    projectId: "project-b",
    startedAt: "2026-05-18T02:00:00.000Z",
    endedAt: "2026-05-18T02:25:00.000Z",
    durationMinutes: 25,
    status: "completed"
  },
  {
    id: "session-3",
    type: "work",
    projectId: "project-a",
    startedAt: "2026-05-18T03:00:00.000Z",
    endedAt: "2026-05-18T03:08:00.000Z",
    durationMinutes: 8,
    status: "interrupted"
  }
];

describe("reports", () => {
  it("按确认后的项目汇总，忽略 initialProjectId 和中断记录", () => {
    const source = buildDailySource(sessions, projects, "2026-05-18");

    expect(source.sessions).toHaveLength(2);
    expect(source.summaries).toEqual([
      {
        projectId: "project-b",
        projectName: "产品设计",
        minutes: 50,
        count: 2,
        notes: ["修正需求"]
      }
    ]);
  });

  it("生成报告 prompt 时不编造空记录", () => {
    const source = buildDailySource([], projects, "2026-05-18");
    const prompt = buildReportPrompt(source);

    expect(prompt).toContain("没有完成的番茄钟记录");
  });

  it("项目不存在时仍能生成可读汇总", () => {
    const summary = summarizeSessions(
      [
        {
          id: "session-x",
          type: "work",
          projectId: "missing",
          startedAt: "2026-05-18T01:00:00.000Z",
          endedAt: "2026-05-18T01:25:00.000Z",
          durationMinutes: 25,
          status: "completed"
        }
      ],
      projects
    );

    expect(summary[0].projectName).toBe("未命名项目");
  });
});
