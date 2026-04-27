import React from "react";
function fmt(n) {
  if (n == null) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
export default function StatCards({ summary }) {
  const items = [
    { label: "Total sessions", value: summary?.totalSessions, kind: "display" },
    { label: "Total clicks", value: summary?.totalClicks, kind: "display" },
    { label: "CTA clicks", value: summary?.totalCtaClicks, kind: "display" },
    { label: "Avg. max scroll", value: summary?.avgMaxScroll != null ? `${summary.avgMaxScroll}%` : "—", kind: "mono" }
  ];
  return (
    <div className="stats">
      {items.map((it) => (
        <div className="stat" key={it.label}>
          <div className="stat-label">{it.label}</div>
          <div className={"stat-value " + (it.kind === "mono" ? "mono" : "")}>
            {typeof it.value === "string" ? it.value : fmt(it.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
