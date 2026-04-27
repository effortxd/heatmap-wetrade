const express = require("express");
const { db } = require("../db");

const router = express.Router();

// ---- Filter helper ---------------------------------------------------------
// Builds a WHERE clause with optional `from`, `to` (timestamps in ms), and `page`.
function buildFilter(req, opts) {
  opts = opts || {};
  const tsCol = opts.tsCol || "timestamp";
  const urlCol = opts.urlCol || "page_url";

  const conditions = [];
  const params = [];

  const from = parseInt(req.query.from, 10);
  const to = parseInt(req.query.to, 10);
  const page = req.query.page;

  if (Number.isFinite(from)) { conditions.push(`${tsCol} >= ?`); params.push(from); }
  if (Number.isFinite(to))   { conditions.push(`${tsCol} <= ?`); params.push(to); }
  if (page)                  { conditions.push(`${urlCol} = ?`); params.push(page); }

  return {
    where: conditions.length ? "WHERE " + conditions.join(" AND ") : "",
    andOrWhere: conditions.length ? "AND " + conditions.join(" AND ") : "",
    params
  };
}

// ---- /summary --------------------------------------------------------------
router.get("/summary", (req, res) => {
  const f = buildFilter(req);

  const totalSessions = db.prepare(
    `SELECT COUNT(DISTINCT session_id) AS c FROM clicks ${f.where}`
  ).get(...f.params).c;

  const totalClicks = db.prepare(
    `SELECT COUNT(*) AS c FROM clicks ${f.where}`
  ).get(...f.params).c;

  const totalCtaClicks = db.prepare(
    `SELECT COUNT(*) AS c FROM cta_clicks ${f.where}`
  ).get(...f.params).c;

  const avgMaxScroll = db.prepare(
    `SELECT ROUND(AVG(depth), 1) AS d FROM scroll_depth
       ${f.where ? f.where + " AND" : "WHERE"} is_max = 1`
  ).get(...f.params).d || 0;

  res.json({ totalSessions, totalClicks, totalCtaClicks, avgMaxScroll });
});

// ---- /devices --------------------------------------------------------------
router.get("/devices", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare(`
    SELECT device_type, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS clicks
    FROM clicks ${f.where}
    GROUP BY device_type
  `).all(...f.params);
  res.json(rows);
});

// ---- /top-clicks -----------------------------------------------------------
router.get("/top-clicks", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare(`
    SELECT
      element_tag,
      element_id,
      element_class,
      element_text,
      COUNT(*) AS clicks,
      COUNT(DISTINCT session_id) AS sessions
    FROM clicks ${f.where}
    GROUP BY element_tag, element_id, element_class, element_text
    ORDER BY clicks DESC
    LIMIT 25
  `).all(...f.params);
  res.json(rows);
});

// ---- /scroll-depth ---------------------------------------------------------
router.get("/scroll-depth", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare(`
    SELECT depth, COUNT(DISTINCT session_id) AS sessions
    FROM scroll_depth
    ${f.where ? f.where + " AND" : "WHERE"} is_max = 0
    GROUP BY depth
    ORDER BY depth
  `).all(...f.params);
  res.json(rows);
});

// ---- /section-time ---------------------------------------------------------
router.get("/section-time", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare(`
    SELECT
      section_name,
      ROUND(AVG(duration_ms)) AS avg_duration_ms,
      SUM(duration_ms) AS total_duration_ms,
      COUNT(*) AS views,
      COUNT(DISTINCT session_id) AS unique_sessions
    FROM section_views ${f.where}
    GROUP BY section_name
    ORDER BY avg_duration_ms DESC
  `).all(...f.params);
  res.json(rows);
});

// ---- /cta -------------------------------------------------------------------
router.get("/cta", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare(`
    SELECT
      track_name,
      COUNT(*) AS clicks,
      COUNT(DISTINCT session_id) AS unique_sessions,
      SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) AS mobile_clicks,
      SUM(CASE WHEN device_type = 'desktop' THEN 1 ELSE 0 END) AS desktop_clicks
    FROM cta_clicks ${f.where}
    GROUP BY track_name
    ORDER BY clicks DESC
  `).all(...f.params);
  res.json(rows);
});

// ---- /heatmap (raw click points for overlay) -------------------------------
router.get("/heatmap", (req, res) => {
  const f = buildFilter(req);
  const rows = db.prepare(`
    SELECT x, y, viewport_width, viewport_height, device_type
    FROM clicks ${f.where}
    LIMIT 10000
  `).all(...f.params);
  res.json(rows);
});

// ---- /pages (for filter dropdown) ------------------------------------------
router.get("/pages", (_req, res) => {
  const rows = db.prepare(`
    SELECT page_url, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS sessions
    FROM clicks
    GROUP BY page_url
    ORDER BY clicks DESC
  `).all();
  res.json(rows);
});

module.exports = router;
