export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getYesterdayKey(now = new Date()): string {
  return toLocalDateKey(addDays(now, -1));
}

export function getPreviousNaturalWeek(now = new Date()): { start: Date; end: Date } {
  const today = startOfLocalDay(now);
  const day = today.getDay() || 7;
  const currentMonday = addDays(today, 1 - day);
  const previousMonday = addDays(currentMonday, -7);
  const previousSundayEnd = new Date(currentMonday.getTime() - 1);
  return { start: previousMonday, end: previousSundayEnd };
}

export function isDateInRange(value: string, start: Date, end: Date): boolean {
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function formatRemainingMinutes(seconds: number): string {
  if (seconds > 0 && seconds < 60) {
    return "<1";
  }

  return String(Math.max(0, Math.floor(seconds / 60)));
}
