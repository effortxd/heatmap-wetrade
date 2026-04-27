import React from "react";
export default function CTAReport({ rows }) {
  const max = Math.max(1, ...(rows || []).map((r) => r.clicks));
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">CTA performance</h3>
        <span className="card-meta">elements with data-track</span>
      </div>
      {!rows?.length ? (
        <div className="empty">Add data-track to your CTAs</div>
      ) : (
        <table className="tbl">
          <thead><tr><th>CTA</th><th style={{ width: 200 }}>Clicks</th><th style={{ width: 70, textAlign: "right" }}>Total</th><th style={{ width: 70, textAlign: "right" }}>Mobile</th><th style={{ width: 70, textAlign: "right" }}>Desktop</th><th style={{ width: 80, textAlign: "right" }}>Sessions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.track_name}>
                <td className="lead"><span className="tag">{r.track_name}</span></td>
                <td><div className="bar-cell"><span style={{ width: (r.clicks / max) * 100 + "%" }} /></div></td>
                <td className="num">{r.clicks}</td>
                <td className="num">{r.mobile_clicks}</td>
                <td className="num">{r.desktop_clicks}</td>
                <td className="num">{r.unique_sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
