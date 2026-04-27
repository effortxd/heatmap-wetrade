import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = { mobile: "#ff6b1f", desktop: "#f4a261", unknown: "#6b6457" };

export default function DeviceBreakdown({ rows }) {
  const data = (rows || []).map((r) => ({
    name: r.device_type || "unknown",
    value: r.sessions,
    clicks: r.clicks
  }));
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Devices</h3>
        <span className="card-meta">sessions</span>
      </div>
      {!total ? (
        <div className="empty">No device data</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 160, height: 160 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={COLORS[d.name] || "#6b6457"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#181714", border: "1px solid #2a2823", borderRadius: 6, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1 }}>
            {data.map((d) => {
              const pct = Math.round((d.value / total) * 100);
              return (
                <div key={d.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "capitalize", fontSize: 13 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[d.name] || "#6b6457" }} />
                      {d.name}
                    </span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>
                      {d.value} <span style={{ color: "#6b6457" }}>· {pct}%</span>
                    </span>
                  </div>
                  <div className="bar-cell">
                    <span style={{ width: pct + "%", background: COLORS[d.name] || "#6b6457" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
