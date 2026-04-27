import React from "react";

function fmtMs(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return ms + "ms";
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + "s";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m ${r}s`;
}

export default function SectionTime({ rows }) {
  const max = Math.max(1, ...(rows || []).map((r) => r.avg_duration_ms));
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Time on section</h3>
        <span className="card-meta">avg per visit</span>
      </div>
      {!rows?.length ? (
        <div className="empty">Add <code>data-section</code> to your sections</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Section</th>
              <th style={{ width: 200 }}>Avg time</th>
              <th style={{ width: 80, textAlign: "right" }}>Avg</th>
              <th style={{ width: 80, textAlign: "right" }}>Views</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.section_name}>
                <td className="lead"><span className="tag">{r.section_name}</span></td>
                <td>
                  <div className="bar-cell">
                    <span style={{ width: (r.avg_duration_ms / max) * 100 + "%" }} />
                  </div>
                </td>
                <td className="num">{fmtMs(r.avg_duration_ms)}</td>
                <td className="num">{r.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
