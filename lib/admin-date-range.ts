export type AdminDatePreset = "today" | "week" | "month" | "90d" | "custom";

export type AdminDateRangeValue = {
  preset: AdminDatePreset;
  from: string;
  to: string;
};

const SITE_TIME_ZONE = "Asia/Shanghai";

export function adminToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function adminDateRange(preset: Exclude<AdminDatePreset, "custom">, now = new Date()): AdminDateRangeValue {
  const to = adminToday(now);
  let from = to;
  if (preset === "week") {
    const weekday = new Date(`${to}T00:00:00Z`).getUTCDay();
    from = shiftDay(to, -(weekday === 0 ? 6 : weekday - 1));
  } else if (preset === "month") {
    from = `${to.slice(0, 7)}-01`;
  } else if (preset === "90d") {
    from = shiftDay(to, -89);
  }
  return { preset, from, to };
}

export function validAdminDateRange(value: AdminDateRangeValue): boolean {
  const valid = (day: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const parsed = new Date(`${day}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
  };
  return valid(value.from) && valid(value.to) && value.from <= value.to && value.to <= adminToday();
}

export function adminDateQuery(value: AdminDateRangeValue): { from: string; to: string } {
  return {
    from: new Date(`${value.from}T00:00:00+08:00`).toISOString(),
    to: new Date(`${value.to}T23:59:59.999+08:00`).toISOString(),
  };
}
