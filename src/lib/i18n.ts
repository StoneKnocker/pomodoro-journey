export type Language = "en" | "zh-CN";

const dict: Record<string, Record<Language, string>> = {
  // Popup
  "popup.focusing": { en: "Focusing", "zh-CN": "专注中" },
  "popup.onBreak": { en: "On Break", "zh-CN": "休息中" },
  "popup.todayWork": { en: "Today's Work", "zh-CN": "今日工作" },
  "popup.awaitingConfirm": { en: "Awaiting Confirm", "zh-CN": "完成待确认" },
  "popup.breakHint": { en: "Start a new pomodoro after the break", "zh-CN": "休息结束后可开启下一个番茄钟" },
  "popup.idleHint": { en: "{n} min completed", "zh-CN": "{n} 分钟已完成" },
  "popup.confirmHint": { en: "Fix project and details, then save", "zh-CN": "修正项目和细节后保存" },
  "popup.projectColon": { en: "Project: ", "zh-CN": "项目：" },
  "popup.project": { en: "Project", "zh-CN": "项目" },
  "popup.detail": { en: "Detail", "zh-CN": "细节" },
  "popup.notePlaceholder": {
    en: "What did you accomplish? (Ctrl+Enter to submit)",
    "zh-CN": "记录这次番茄钟完成了什么，可留空 (Ctrl+Enter 提交)"
  },
  "popup.saveRecord": { en: "Save Record", "zh-CN": "保存记录" },
  "popup.selectProject": { en: "Select Project", "zh-CN": "选择项目" },
  "popup.newProject": { en: "New Project", "zh-CN": "新项目" },
  "popup.addProject": { en: "Add Project", "zh-CN": "新增项目" },
  "popup.start": { en: "Start", "zh-CN": "开始" },
  "popup.break": { en: "Break", "zh-CN": "休息" },
  "popup.interrupt": { en: "Interrupt", "zh-CN": "中断" },
  "popup.todayStats": { en: "Today's Stats", "zh-CN": "今日统计" },
  "popup.minutes": { en: "min", "zh-CN": "分钟" },
  "popup.noSessions": { en: "No completed pomodoros.", "zh-CN": "还没有完成的番茄钟。" },
  "popup.settings": { en: "Settings", "zh-CN": "设置" },

  // Options
  "options.title": { en: "Settings", "zh-CN": "设置" },
  "options.stats": { en: "Stats", "zh-CN": "统计" },
  "options.timer": { en: "Timer", "zh-CN": "计时" },
  "options.workMinutes": { en: "Work Minutes", "zh-CN": "工作分钟" },
  "options.breakMinutes": { en: "Break Minutes", "zh-CN": "休息分钟" },
  "options.model": { en: "Model", "zh-CN": "模型" },
  "options.enableGist": { en: "Enable Gist multi-device sync", "zh-CN": "启用 Gist 多设备同步" },
  "options.gistIdPlaceholder": {
    en: "Leave empty to auto-discover or create",
    "zh-CN": "留空则自动发现或创建"
  },
  "options.lastSync": { en: "Last sync: ", "zh-CN": "上次同步：" },
  "options.neverSynced": { en: "Not synced yet", "zh-CN": "尚未同步" },
  "options.syncNow": { en: "Sync Now", "zh-CN": "立即同步" },
  "options.saveSettings": { en: "Save Settings", "zh-CN": "保存设置" },
  "options.copyData": { en: "Copy Data", "zh-CN": "复制数据" },
  "options.settingsSaved": { en: "Settings saved", "zh-CN": "设置已保存" },
  "options.syncComplete": { en: "Sync complete", "zh-CN": "同步完成" },
  "options.language": { en: "Language", "zh-CN": "语言" },

  // Stats
  "stats.title": { en: "Stats", "zh-CN": "统计" },
  "stats.dailyStats": { en: "Daily Stats", "zh-CN": "每日统计" },
  "stats.pomoCount": { en: "pomo", "zh-CN": "个番茄" },
  "stats.pomodoroCount": { en: "{n} pomodoros", "zh-CN": "{n} 个番茄钟" },
  "stats.today": { en: "(today)", "zh-CN": "(今天)" },
  "stats.latestReport": { en: "Latest Report", "zh-CN": "最新报告" },
  "stats.generateReport": { en: "Generate Last Week Report", "zh-CN": "生成上周周报" },
  "stats.noReport": { en: "No reports yet.", "zh-CN": "还没有报告。" },
  "stats.reportGenerated": { en: "Report generated", "zh-CN": "周报已生成" },

  // Day names
  "days.mon": { en: "Mon", "zh-CN": "一" },
  "days.tue": { en: "Tue", "zh-CN": "二" },
  "days.wed": { en: "Wed", "zh-CN": "三" },
  "days.thu": { en: "Thu", "zh-CN": "四" },
  "days.fri": { en: "Fri", "zh-CN": "五" },
  "days.sat": { en: "Sat", "zh-CN": "六" },
  "days.sun": { en: "Sun", "zh-CN": "日" },

  // Notifications
  "notif.workDoneTitle": { en: "Pomodoro Complete", "zh-CN": "番茄钟完成" },
  "notif.workDoneMsg": {
    en: "Confirm project and details to save this session.",
    "zh-CN": "确认项目和细节后保存这次记录。"
  },
  "notif.breakDoneTitle": { en: "Break Over", "zh-CN": "休息结束" },
  "notif.breakDoneMsg": {
    en: "Break is over. Start a new pomodoro.",
    "zh-CN": "休息时间结束，可以开始新的番茄钟了。"
  },

  // Errors
  "error.operationFailed": { en: "Operation failed", "zh-CN": "操作失败" },

  // Projects
  "project.unnamed": { en: "Unnamed Project", "zh-CN": "未命名项目" },
  "project.unselected": { en: "Unselected", "zh-CN": "未选择项目" },

  // Reports
  "report.noSessions": { en: "No completed pomodoro records.", "zh-CN": "没有完成的番茄钟记录。" }
};

export function t(key: string, lang: Language, params?: Record<string, string | number>): string {
  const entry = dict[key];
  const template = entry?.[lang] ?? entry?.en ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

const DAY_KEYS = ["days.sun", "days.mon", "days.tue", "days.wed", "days.thu", "days.fri", "days.sat"] as const;

export function tDay(date: Date, lang: Language): string {
  return t(DAY_KEYS[date.getDay()], lang);
}

/** Report-related prompts — kept separate since they're longer text blocks */
export function reportSystemPrompt(lang: Language): string {
  return lang === "zh-CN"
    ? "你是一个严谨的工作记录助手，只基于用户提供的番茄钟记录总结。"
    : "You are a diligent work-recording assistant. Summarize based only on the pomodoro records provided.";
}

export function reportPrompt(lang: Language, range: string, totalMinutes: number, summariesText: string): string {
  return lang === "zh-CN"
    ? [
        "请基于以下番茄钟记录生成一份中文工作周报。",
        `时间范围：${range}`,
        `总工作时间：${totalMinutes} 分钟`,
        "要求：按项目总结产出，保留具体事项，最后给出下一步建议。不要编造不存在的工作。",
        "记录：",
        summariesText
      ].join("\n")
    : [
        "Generate an English weekly work report based on the following pomodoro records.",
        `Period: ${range}`,
        `Total work time: ${totalMinutes} minutes`,
        "Requirements: summarize output by project, keep specific items, and give next-step recommendations. Do not fabricate work.",
        "Records:",
        summariesText
      ].join("\n");
}

export function reportEmptyPrompt(lang: Language, range: string): string {
  return lang === "zh-CN"
    ? `请生成一份简短中文周报。时间范围：${range}。没有完成的番茄钟记录，请如实说明无有效工作记录，并给出一句改进建议。`
    : `Generate a short English weekly report. Period: ${range}. No completed pomodoro records. Honestly state there are no valid work records and give one improvement suggestion.`;
}

export function reportLocalHeader(lang: Language, totalMinutes: number): string {
  return lang === "zh-CN" ? `总工作时间：${totalMinutes} 分钟` : `Total work time: ${totalMinutes} min`;
}

export function reportLocalItem(lang: Language, name: string, minutes: number, count: number, notes: string): string {
  const pomoLabel = lang === "zh-CN" ? "个番茄钟" : "pomodoros";
  return `${name}: ${minutes} min, ${count} ${pomoLabel}${notes}`;
}
