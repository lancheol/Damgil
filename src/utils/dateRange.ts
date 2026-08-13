/** 코스 생성 API `days` 상한(1–5)과 맞춤 */
export const COURSE_MAX_DAYS = 5;

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function inclusiveDayCount(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function formatNightDayLabel(dayCount: number): string {
  if (dayCount <= 1) {
    return '당일치기';
  }
  return `${dayCount - 1}박 ${dayCount}일`;
}

export function formatDotDate(iso: string): string {
  return iso.replace(/-/g, '.');
}

export function formatDateRangeLabel(start: string, end: string): string {
  const label = formatNightDayLabel(inclusiveDayCount(start, end));
  if (start === end) {
    return `${formatDotDate(start)} · ${label}`;
  }
  return `${formatDotDate(start)} – ${formatDotDate(end)} · ${label}`;
}

export function clampDateRange(
  start: string,
  end: string,
  maxDays: number = COURSE_MAX_DAYS,
): { startDate: string; endDate: string } {
  if (end < start) {
    return { startDate: start, endDate: start };
  }
  if (inclusiveDayCount(start, end) <= maxDays) {
    return { startDate: start, endDate: end };
  }
  return { startDate: start, endDate: addDaysISO(start, maxDays - 1) };
}

export function monthGrid(year: number, monthIndex: number): Array<string | null> {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<string | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toISODate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}
