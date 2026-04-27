const express = require("express");
const { db } = require("../db");

const router = express.Router();

// ---- Prepared statements (compiled once) ------------------------------------
const upsertSession = db.prepare(`
  INSERT INTO sessions (id, first_seen, last_seen, device_type, viewport_width, viewport_height, user_agent, referrer)
  VALUES (@id, @t, @t, @device_type, @viewport_width, @viewport_height, @user_agent, @referrer)
  ON CONFLICT(id) DO UPDATE SET
    last_seen = excluded.last_seen,
    viewport_width = excluded.viewport_width,
    viewport_height = excluded.viewport_height
`);

const insertClick = db.prepare(`
  INSERT INTO clicks
    (session_id, page_url, x, y, viewport_width, viewport_height,
     element_tag, element_id, element_class, element_text, device_type, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertScroll = db.prepare(`
  INSERT INTO scroll_depth (session_id, page_url, depth, is_max, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

const insertSection = db.prepare(`
  INSERT INTO section_views (session_id, page_url, section_name, duration_ms, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

const insertCta = db.prepare(`
  INSERT INTO cta_clicks (session_id, page_url, track_name, device_type, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

// ---- Helpers ----------------------------------------------------------------
function safeStr(v, max) {
  if (v == null) return null;
  return String(v).slice(0, max || 500);
}

function safeInt(v) {
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// ---- POST /api/track --------------------------------------------------------
router.post("/", (req, res) => {
  try {
    const body = req.body || {};
    const session = body.session;
    const events = Array.isArray(body.events) ? body.events : [];

    if (!session || !session.id) {
      return res.status(400).json({ error: "session.id required" });
    }

    const sid = safeStr(session.id, 100);
    const deviceType = safeStr(session.device_type, 20);
    const now = Date.now();

    const txn = db.transaction(() => {
      upsertSession.run({
        id: sid,
        t: now,
        device_type: deviceType,
        viewport_width: safeInt(session.viewport_width),
        viewport_height: safeInt(session.viewport_height),
        user_agent: safeStr(session.user_agent, 500),
        referrer: safeStr(session.referrer, 500)
      });

      for (const e of events) {
        if (!e || !e.type) continue;
        const ts = safeInt(e.t) || now;
        const url = safeStr(e.url, 500) || "/";

        switch (e.type) {
          case "pageview":
            // Just keeps the session alive; no per-event row.
            break;
          case "click":
            insertClick.run(
              sid, url,
              safeInt(e.x), safeInt(e.y),
              safeInt(e.vw), safeInt(e.vh),
              safeStr(e.tag, 30),
              safeStr(e.id, 100),
              safeStr(e.cls, 200),
              safeStr(e.txt, 100),
              deviceType,
              ts
            );
            break;
          case "scroll":
            insertScroll.run(sid, url, safeInt(e.depth) || 0, 0, ts);
            break;
          case "max_scroll":
            insertScroll.run(sid, url, safeInt(e.depth) || 0, 1, ts);
            break;
          case "section":
            insertSection.run(
              sid, url,
              safeStr(e.section_name, 100) || "unknown",
              safeInt(e.duration_ms) || 0,
              ts
            );
            break;
          case "cta":
            insertCta.run(
              sid, url,
              safeStr(e.track_name, 100) || "unknown",
              deviceType,
              ts
            );
            break;
          default:
            // ignore unknown event types
        }
      }
    });

    txn();
    res.json({ ok: true, received: events.length });
  } catch (err) {
    console.error("track error:", err);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
