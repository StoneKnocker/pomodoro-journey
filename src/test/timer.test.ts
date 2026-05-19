import { describe, expect, it, vi } from "vitest";
import { DEFAULT_DATA } from "../lib/defaults";
import { completeWork, interruptTimer, startWork, tickTimer } from "../lib/messages";
import { formatRemainingMinutes } from "../lib/time";
import type { AppData } from "../lib/types";

vi.stubGlobal("crypto", {
  randomUUID: () => "fixed-id"
});

const baseData: AppData = {
  ...DEFAULT_DATA,
  projects: [
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
  ],
  settings: {
    ...DEFAULT_DATA.settings,
    workMinutes: 25,
    breakMinutes: 5
  }
};

describe("timer", () => {
  it("工作计时结束后进入待确认状态", () => {
    const started = startWork(baseData, "project-a", new Date("2026-05-18T01:00:00.000Z"));
    const ticked = tickTimer(started, new Date("2026-05-18T01:25:01.000Z"));

    expect(ticked.timer.mode).toBe("awaiting-confirmation");
    expect(ticked.sessions).toHaveLength(0);
  });

  it("确认时允许把项目改成最终项目", () => {
    const started = startWork(baseData, "project-a", new Date("2026-05-18T01:00:00.000Z"));
    const awaiting = tickTimer(started, new Date("2026-05-18T01:25:01.000Z"));
    const completed = completeWork(awaiting, "project-b", "补充细节", new Date("2026-05-18T01:26:00.000Z"));

    expect(completed.timer.mode).toBe("idle");
    expect(completed.sessions[0]).toMatchObject({
      projectId: "project-b",
      initialProjectId: "project-a",
      note: "补充细节",
      status: "completed"
    });
  });

  it("中断记录不会保存为 completed", () => {
    const started = startWork(baseData, "project-a", new Date("2026-05-18T01:00:00.000Z"));
    const interrupted = interruptTimer(started, new Date("2026-05-18T01:08:00.000Z"));

    expect(interrupted.timer.mode).toBe("idle");
    expect(interrupted.sessions[0].status).toBe("interrupted");
    expect(interrupted.sessions[0].durationMinutes).toBe(8);
  });

  it("不足一分钟显示为 <1", () => {
    expect(formatRemainingMinutes(59)).toBe("<1");
    expect(formatRemainingMinutes(60)).toBe("1");
    expect(formatRemainingMinutes(0)).toBe("0");
  });
});
