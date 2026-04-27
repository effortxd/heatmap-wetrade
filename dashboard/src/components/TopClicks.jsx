import React from "react";

function describe(row) {
  let s = `<${row.element_tag || "?"}>`;
  if (row.element_id) s += `#${row.element_id}`;
  else if (row.element_class) {
    const first = row.element_class.split(/\s+/)[0];
    if (first) s += `.${first}`;
  }
  return s;
}

export default function TopClicks({ rows }) {
  const max = Math.max(1, ...(rows || []).map((r) => r.clicks));
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Top clicked elements</h3>
        <span className="card-meta">{rows?.length || 0} entries</span>
      </div>
      {!rows?.length ? (
        <div className="empty">No click data in this range</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Element</th>
              <th>Text</th>
              <th style={{ width: 180 }}>Clicks</th>
              <th style={{ width: 80, textAlign: "right" }}>#</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="lead"><span className="tag">{describe(r)}</span></td>
                <td>{r.element_text || <span style={{ opacity: 0.4 }}>—</span>}</td>
                <td>
                  <div className="bar-cell">
                    <span style={{ width: (r.clicks / max) * 100 + "%" }} />
                  </div>
                </td>
                <td className="num">{r.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
