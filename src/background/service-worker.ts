import { handleClientMessage, tickTimer } from "../lib/messages";
import { loadData, updateData } from "../lib/storage";
import type { ClientMessage } from "../lib/types";
import { formatRemainingMinutes, getYesterdayKey } from "../lib/time";

const TICK_ALARM = "pomodoro-tick";
const DAILY_REPORT_ALARM = "pomodoro-daily-report";
const OFFSCREEN_DOC = "offscreen.html";

let offscreenReady = false;

async function ensureOffscreen(): Promise<void> {
  if (offscreenReady) {
    return;
  }

  const hasDoc = await chrome.offscreen.hasDocument();
  if (!hasDoc) {
    // 先注册监听，再创建文档，确保不错过 offscreen-ready 消息
    const readyPromise = new Promise<void>((resolve) => {
      const listener = (msg: unknown) => {
        if (msg === "offscreen-ready") {
          chrome.runtime.onMessage.removeListener(listener);
          resolve();
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    });

    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOC,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "播放计时结束提示音"
    });

    await readyPromise;
  }

  offscreenReady = true;
}

async function playChime(): Promise<void> {
  try {
    await ensureOffscreen();
    chrome.runtime.sendMessage("play-chime");
  } catch {
    // 提示音播放失败不影响主流程
  }
}

async function updateBadge(): Promise<void> {
  const data = await loadData();
  const draft = data.timer.draft;

  if (!draft || data.timer.mode === "idle") {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  if (data.timer.mode === "awaiting-confirmation") {
    await chrome.action.setBadgeText({ text: "✓" });
    await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
    return;
  }

  const secondsLeft = (new Date(draft.endsAt).getTime() - Date.now()) / 1000;
  await chrome.action.setBadgeText({ text: formatRemainingMinutes(secondsLeft) });
  await chrome.action.setBadgeBackgroundColor({
    color: data.timer.mode === "work" ? "#0f766e" : "#7c3aed"
  });
}

async function runTick(): Promise<void> {
  let prevDraftType: string | undefined;

  const data = await updateData((current) => {
    prevDraftType = current.timer.draft?.type;
    return tickTimer(current);
  });

  if (data.timer.mode === "awaiting-confirmation") {
    await playChime();
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "番茄钟完成",
      message: "确认项目和细节后保存这次记录。"
    });
  } else if (prevDraftType === "break" && data.timer.mode === "idle") {
    await playChime();
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "休息结束",
      message: "休息时间结束，可以开始新的番茄钟了。"
    });
  }

  await updateBadge();
}

async function maybeGenerateMissedDailyReport(): Promise<void> {
  const yesterday = getYesterdayKey();

  try {
    await updateData(async (data) => {
      if (data.lastDailyReportDate === yesterday) {
        return data;
      }
      return handleClientMessage(data, { type: "GENERATE_DAILY_REPORT", date: yesterday });
    });
  } catch (error) {
    console.warn("daily report generation failed", error);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  await chrome.alarms.create(DAILY_REPORT_ALARM, { periodInMinutes: 60 });
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  await chrome.alarms.create(DAILY_REPORT_ALARM, { periodInMinutes: 60 });
  await runTick();
  await maybeGenerateMissedDailyReport();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TICK_ALARM) {
    await runTick();
  }

  if (alarm.name === DAILY_REPORT_ALARM) {
    const data = await loadData();
    const hour = new Date().getHours();
    if (hour >= data.settings.dailyReportHour) {
      await maybeGenerateMissedDailyReport();
    }
  }
});

chrome.runtime.onMessage.addListener((message: ClientMessage, _sender, sendResponse) => {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return;
  }

  updateData((data) => handleClientMessage(data, message))
    .then(async (data) => {
      await updateBadge();
      sendResponse({ ok: true, data });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });

  return true;
});
