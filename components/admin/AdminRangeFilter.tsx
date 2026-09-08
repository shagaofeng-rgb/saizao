"use client";

export type RangePreset = "today" | "week" | "month" | "30d" | "custom";

function parts(value: Date) {
  const map = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(value).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function plusDays(day:string, amount:number) {
  const date=new Date(`${day}T12:00:00+08:00`); date.setDate(date.getDate()+amount); return parts(date);
}
export function presetBounds(preset:RangePreset) {
  const today=parts(new Date());
  if(preset==="today") return {from:today,to:today};
  if(preset==="30d") return {from:plusDays(today,-29),to:today};
  if(preset==="month") return {from:`${today.slice(0,7)}-01`,to:today};
  const local=new Date(`${today}T12:00:00+08:00`); const weekday=(local.getDay()+6)%7;
  return {from:plusDays(today,-weekday),to:today};
}
export function toRangeQuery(from:string,to:string) {
  return {from:new Date(`${from}T00:00:00+08:00`).toISOString(),to:new Date(`${to}T23:59:59.999+08:00`).toISOString()};
}
export function formatChina(value?:string) {
  if(!value) return "—";
  const date=new Date(value); if(Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
}
export function AdminRangeFilter({preset,from,to,onPreset,onFrom,onTo,onApply}:{preset:RangePreset;from:string;to:string;onPreset:(value:RangePreset)=>void;onFrom:(value:string)=>void;onTo:(value:string)=>void;onApply?:()=>void}) {
  const items:[RangePreset,string][]=[["today","今天"],["week","本周"],["month","本月"],["30d","近 30 天"],["custom","自定义"]];
  return <div className="admin-range-filter" aria-label="时间范围">
    <div className="admin-range-presets">{items.map(([key,label])=><button type="button" key={key} className={preset===key?"active":""} onClick={()=>onPreset(key)}>{label}</button>)}</div>
    {preset==="custom"&&<div className="admin-range-custom"><label>开始<input type="date" value={from} max={to} onChange={e=>onFrom(e.target.value)}/></label><label>结束<input type="date" value={to} min={from} max={parts(new Date())} onChange={e=>onTo(e.target.value)}/></label>{onApply&&<button type="button" onClick={onApply}>查询</button>}</div>}
    <span className="admin-range-caption">{from} 至 {to} · 中国标准时间</span>
  </div>;
}
