import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

const COLOR = "#ff6b1f";
const GRID = "#2a2823";
const INK = "#b8ad99";

const TOOLTIP_STYLE = {
  background: "#181714",
  border: "1px solid #ff6b1f",
  borderRadius: 6,
  fontSize: 12,
  color: "#f4ede0",
  padding: "8px 12px"
};
const ITEM_STYLE = { color: "#f4ede0" };
const LABEL_STYLE = {
  color: "#ff6b1f",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  marginBottom: 4
};

export default function ScrollChart({ rows, totalSessions }) {
  const data = [25, 50, 75, 100].map((d) => {
    const found = rows?.find((r) => r.depth === d);
    const sessions = found?.sessions || 0;
    const pct = totalSessions ? Math.round((sessions / totalSessions) * 100) : 0;
    return { depth: d + "%", sessions, pct };
  });

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Scroll depth</h3>
        <span className="card-meta">% of sessions reaching</span>
      </div>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="depth" stroke={INK} fontSize={11} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis stroke={INK} fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,107,31,0.08)" }}
              contentStyle={TOOLTIP_STYLE}
              itemStyle={ITEM_STYLE}
              labelStyle={LABEL_STYLE}
              formatter={(v, n, p) => [`${v} sessions (${p.payload.pct}%)`, "Reached"]}
            />
            <Bar dataKey="sessions" fill={COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
