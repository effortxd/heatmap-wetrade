const express = require("express");
const { db } = require("../db");
const router = express.Router();

function buildFilter(req) {
  const conditions = [];
  const params = [];
  const from = parseInt(req.query.from, 10);
  const to = parseInt(req.query.to, 10);
  const page = req.query.page;
  if (Number.isFinite(from)) { conditions.push("timestamp >= ?"); params.push(from); }
  if (Number.isFinite(to)) { conditions.push("timestamp <= ?"); params.push(to); }
  if (page) { conditions.push("page_url = ?"); params.push(page); }
  return { where: conditions.length ? "WHERE " + conditions.join(" AND ") : "", params };
}

router.get("/summary", (req, res) => {
  const f = buildFilter(req);
  const totalSessions = db.prepare("SELECT COUNT(DISTINCT session_id) AS c FROM clicks " + f.where).get(...f.params).c;
  const totalClicks = db.prepare("SELECT COUNT(*) AS c FROM clicks " + f.where).get(...f.params).c;
  const totalCtaClicks = db.prepare("SELECT COUNT(*) AS c FROM cta_clicks " + f.where).get(...f.params).c;
  const avgMaxScroll = db.prepare("SELECT ROUND(AVG(depth), 1) AS d FROM scroll_depth " + (f.where ? f.where + " AND" : "WHERE") + " is_max = 1").get(...f.params).d || 0;
  res.json({ totalSessions, totalClicks, totalCtaClicks, avgMaxScroll });
});

router.get("/devices", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare("SELECT device_type, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS clicks FROM clicks " + f.where + " GROUP BY device_type").all(...f.params);
  res.json(rows);
});

router.get("/top-clicks", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare("SELECT element_tag, element_id, element_class, element_text, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS sessions FROM clicks " + f.where + " GROUP BY element_tag, element_id, element_class, element_text ORDER BY clicks DESC LIMIT 25").all(...f.params);
  res.json(rows);
});

router.get("/scroll-depth", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare("SELECT depth, COUNT(DISTINCT session_id) AS sessions FROM scroll_depth " + (f.where ? f.where + " AND" : "WHERE") + " is_max = 0 GROUP BY depth ORDER BY depth").all(...f.params);
  res.json(rows);
});

router.get("/section-time", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare("SELECT section_name, ROUND(AVG(duration_ms)) AS avg_duration_ms, SUM(duration_ms) AS total_duration_ms, COUNT(*) AS views, COUNT(DISTINCT session_id) AS unique_sessions FROM section_views " + f.where + " GROUP BY section_name ORDER BY avg_duration_ms DESC").all(...f.params);
  res.json(rows);
});

router.get("/cta", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare("SELECT track_name, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS unique_sessions, SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) AS mobile_clicks, SUM(CASE WHEN device_type = 'desktop' THEN 1 ELSE 0 END) AS desktop_clicks FROM cta_clicks " + f.where + " GROUP BY track_name ORDER BY clicks DESC").all(...f.params);
  res.json(rows);
});

router.get("/heatmap", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare("SELECT x, y, viewport_width, viewport_height, device_type FROM clicks " + f.where + " LIMIT 10000").all(...f.params);
  res.json(rows);
});

router.get("/pages", (_req, res) => {
  const rows = db.prepare("SELECT page_url, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS sessions FROM clicks GROUP BY page_url ORDER BY clicks DESC").all();
  res.json(rows);
});

// ---------------------------------------------------------------------------
//  CSV export — assembles every dashboard section into a single CSV file
//  honoring the current filters (from / to / page).
// ---------------------------------------------------------------------------
function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function csvRow(values) {
  return values.map(csvEscape).join(",") + "\r\n";
}

router.get("/export", (req, res) => {
  const f = buildFilter(req);
  const fmt = (ms) => ms ? new Date(parseInt(ms, 10)).toISOString().slice(0, 10) : "all";
  const fromStr = fmt(req.query.from);
  const toStr = fmt(req.query.to);
  const pageStr = req.query.page || "all pages";
  const generatedAt = new Date().toISOString();

  // --- Pull all data ---
  const summary = {
    totalSessions: db.prepare("SELECT COUNT(DISTINCT session_id) AS c FROM clicks " + f.where).get(...f.params).c,
    totalClicks: db.prepare("SELECT COUNT(*) AS c FROM clicks " + f.where).get(...f.params).c,
    totalCtaClicks: db.prepare("SELECT COUNT(*) AS c FROM cta_clicks " + f.where).get(...f.params).c,
    avgMaxScroll: db.prepare("SELECT ROUND(AVG(depth), 1) AS d FROM scroll_depth " + (f.where ? f.where + " AND" : "WHERE") + " is_max = 1").get(...f.params).d || 0
  };

  const devices = db.prepare("SELECT device_type, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS clicks FROM clicks " + f.where + " GROUP BY device_type ORDER BY clicks DESC").all(...f.params);
  const topClicks = db.prepare("SELECT element_tag, element_id, element_class, element_text, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS sessions FROM clicks " + f.where + " GROUP BY element_tag, element_id, element_class, element_text ORDER BY clicks DESC LIMIT 50").all(...f.params);
  const scrollDepth = db.prepare("SELECT depth, COUNT(DISTINCT session_id) AS sessions FROM scroll_depth " + (f.where ? f.where + " AND" : "WHERE") + " is_max = 0 GROUP BY depth ORDER BY depth").all(...f.params);
  const sectionTime = db.prepare("SELECT section_name, ROUND(AVG(duration_ms)) AS avg_duration_ms, SUM(duration_ms) AS total_duration_ms, COUNT(*) AS views, COUNT(DISTINCT session_id) AS unique_sessions FROM section_views " + f.where + " GROUP BY section_name ORDER BY avg_duration_ms DESC").all(...f.params);
  const cta = db.prepare("SELECT track_name, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS unique_sessions, SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) AS mobile_clicks, SUM(CASE WHEN device_type = 'desktop' THEN 1 ELSE 0 END) AS desktop_clicks FROM cta_clicks " + f.where + " GROUP BY track_name ORDER BY clicks DESC").all(...f.params);
  const pageList = db.prepare("SELECT page_url, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS sessions FROM clicks " + f.where + " GROUP BY page_url ORDER BY clicks DESC").all(...f.params);

  // --- Build CSV ---
  let out = "";

  out += csvRow(["WeTrade Heatmap Report"]);
  out += csvRow(["Generated", generatedAt]);
  out += csvRow(["Date range", `${fromStr} to ${toStr}`]);
  out += csvRow(["Page filter", pageStr]);
  out += "\r\n";

  out += csvRow(["=== SUMMARY ==="]);
  out += csvRow(["Metric", "Value"]);
  out += csvRow(["Total sessions", summary.totalSessions]);
  out += csvRow(["Total clicks", summary.totalClicks]);
  out += csvRow(["Total CTA clicks", summary.totalCtaClicks]);
  out += csvRow(["Average max scroll depth (%)", summary.avgMaxScroll]);
  out += "\r\n";

  out += csvRow(["=== DEVICE BREAKDOWN ==="]);
  out += csvRow(["Device type", "Sessions", "Clicks"]);
  devices.forEach(r => out += csvRow([r.device_type, r.sessions, r.clicks]));
  out += "\r\n";

  out += csvRow(["=== TOP CLICK ELEMENTS ==="]);
  out += csvRow(["Rank", "Tag", "ID", "Classes", "Text", "Clicks", "Sessions"]);
  topClicks.forEach((r, i) => out += csvRow([
    i + 1, r.element_tag, r.element_id, r.element_class, r.element_text, r.clicks, r.sessions
  ]));
  out += "\r\n";

  out += csvRow(["=== SCROLL DEPTH ==="]);
  out += csvRow(["Depth (%)", "Sessions reaching"]);
  scrollDepth.forEach(r => out += csvRow([r.depth, r.sessions]));
  out += "\r\n";

  out += csvRow(["=== SECTION TIME ==="]);
  out += csvRow(["Section name", "Avg duration (ms)", "Total duration (ms)", "Views", "Unique sessions"]);
  sectionTime.forEach(r => out += csvRow([
    r.section_name, r.avg_duration_ms, r.total_duration_ms, r.views, r.unique_sessions
  ]));
  out += "\r\n";

  out += csvRow(["=== CTA PERFORMANCE ==="]);
  out += csvRow(["CTA track name", "Total clicks", "Unique sessions", "Mobile clicks", "Desktop clicks"]);
  cta.forEach(r => out += csvRow([
    r.track_name, r.clicks, r.unique_sessions, r.mobile_clicks, r.desktop_clicks
  ]));
  out += "\r\n";

  out += csvRow(["=== PAGES IN RANGE ==="]);
  out += csvRow(["Page URL", "Clicks", "Sessions"]);
  pageList.forEach(r => out += csvRow([r.page_url, r.clicks, r.sessions]));

  // --- Send response ---
  const filename = `heatmap_${fromStr}_to_${toStr}.csv`;
  // BOM helps Excel recognize UTF-8 (so non-ASCII characters in CTA names render correctly)
  const bom = "\uFEFF";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(bom + out);
});

module.exports = router;
