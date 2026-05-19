import { handleClientMessage, tickTimer } from "../lib/messages";
import { loadData, saveData, updateData } from "../lib/storage";
import type { ClientMessage } from "../lib/types";
import { formatRemainingMinutes, getYesterdayKey } from "../lib/time";

const TICK_ALARM = "pomodoro-tick";
const DAILY_REPORT_ALARM = "pomodoro-daily-report";

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
  await updateData((data) => tickTimer(data));
  const data = await loadData();

  if (data.timer.mode === "awaiting-confirmation") {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.svg",
      title: "番茄钟完成",
      message: "确认项目和细节后保存这次记录。"
    });
  }

  await updateBadge();
}

async function maybeGenerateMissedDailyReport(): Promise<void> {
  const yesterday = getYesterdayKey();
  const data = await loadData();
  if (data.lastDailyReportDate === yesterday) {
    return;
  }

  try {
    const next = await handleClientMessage(data, { type: "GENERATE_DAILY_REPORT", date: yesterday });
    await saveData(next);
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
