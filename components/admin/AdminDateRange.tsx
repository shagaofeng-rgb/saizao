"use client";

import { AdminDateRangeValue, adminDateRange, adminToday, validAdminDateRange } from "@/lib/admin-date-range";

const presets = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "90d", label: "90天" },
  { value: "custom", label: "自定义" },
] as const;

export function AdminDateRange({ value, onChange, id }: { value: AdminDateRangeValue; onChange: (value: AdminDateRangeValue) => void; id: string }) {
  const today = adminToday();
  function updateDate(field: "from" | "to", date: string) {
    if (date === value[field]) return;
    const next = { ...value, [field]: date };
    if (validAdminDateRange(next)) onChange(next);
  }
  return <div className="admin-date-range">
    <fieldset className="admin-range-actions"><legend>时间范围</legend>{presets.map((preset) => <button
      key={preset.value}
      type="button"
      className={value.preset === preset.value ? "active" : ""}
      aria-pressed={value.preset === preset.value}
      onClick={() => onChange(preset.value === "custom" ? { ...value, preset: "custom" } : adminDateRange(preset.value))}
    >{preset.label}</button>)}</fieldset>
    {value.preset === "custom" && <div className="admin-custom-dates">
      <label htmlFor={`${id}-from`}>开始日期<input id={`${id}-from`} type="date" value={value.from} max={value.to || today} onInput={(event) => updateDate("from", event.currentTarget.value)} /></label>
      <label htmlFor={`${id}-to`}>结束日期<input id={`${id}-to`} type="date" value={value.to} min={value.from} max={today} onInput={(event) => updateDate("to", event.currentTarget.value)} /></label>
    </div>}
    <p className="admin-range-caption" role="status">{validAdminDateRange(value) ? `${value.from} — ${value.to} · 北京时间` : "请选择有效日期，结束日期不能晚于今天。"}</p>
  </div>;
}
