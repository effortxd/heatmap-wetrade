import React from "react";

function toLocalDateInput(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
function fromLocalDateInput(str, endOfDay) {
  if (!str) return undefined;
  const d = new Date(str + (endOfDay ? "T23:59:59.999" : "T00:00:00"));
  return d.getTime();
}

export default function Filters({ filters, setFilters, pages, onRefresh, onExport, exporting }) {
  function update(k, v) { setFilters((f) => ({ ...f, [k]: v || undefined })); }
  function preset(days) {
    const to = Date.now();
    const from = to - days * 24 * 60 * 60 * 1000;
    setFilters((f) => ({ ...f, from, to }));
  }
  return (
    <div className="filters">
      <div className="filter-group">
        <label className="filter-label">From</label>
        <input type="date" className="filter" value={toLocalDateInput(filters.from)}
          onChange={(e) => update("from", fromLocalDateInput(e.target.value, false))} />
      </div>
      <div className="filter-group">
        <label className="filter-label">To</label>
        <input type="date" className="filter" value={toLocalDateInput(filters.to)}
          onChange={(e) => update("to", fromLocalDateInput(e.target.value, true))} />
      </div>
      <div className="filter-group">
        <label className="filter-label">Page</label>
        <select className="filter" value={filters.page || ""} onChange={(e) => update("page", e.target.value)}>
          <option value="">All pages</option>
          {pages.map((p) => (<option key={p.page_url} value={p.page_url}>{p.page_url} · {p.clicks}</option>))}
        </select>
      </div>
      <div className="filter-group">
        <label className="filter-label">Quick</label>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn btn-ghost" onClick={() => preset(1)}>24h</button>
          <button type="button" className="btn btn-ghost" onClick={() => preset(7)}>7d</button>
          <button type="button" className="btn btn-ghost" onClick={() => preset(30)}>30d</button>
        </div>
      </div>
      <div className="filter-group">
        <label className="filter-label">Actions</label>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn" onClick={onRefresh}>Refresh</button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onExport}
            disabled={exporting}
            title="Download CSV report for current filter range"
          >
            {exporting ? "..." : "Export CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}
