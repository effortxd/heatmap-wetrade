const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, "heatmap.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
      device_type TEXT, viewport_width INTEGER, viewport_height INTEGER,
      user_agent TEXT, referrer TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON sessions(first_seen);

    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, page_url TEXT NOT NULL,
      x INTEGER, y INTEGER, viewport_width INTEGER, viewport_height INTEGER,
      element_tag TEXT, element_id TEXT, element_class TEXT, element_text TEXT,
      device_type TEXT, timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_clicks_url ON clicks(page_url);
    CREATE INDEX IF NOT EXISTS idx_clicks_ts ON clicks(timestamp);
    CREATE INDEX IF NOT EXISTS idx_clicks_session ON clicks(session_id);

    CREATE TABLE IF NOT EXISTS scroll_depth (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, page_url TEXT NOT NULL,
      depth INTEGER NOT NULL, is_max INTEGER NOT NULL DEFAULT 0, timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scroll_url ON scroll_depth(page_url);
    CREATE INDEX IF NOT EXISTS idx_scroll_ts ON scroll_depth(timestamp);

    CREATE TABLE IF NOT EXISTS section_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, page_url TEXT NOT NULL,
      section_name TEXT NOT NULL, duration_ms INTEGER NOT NULL, timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sections_url ON section_views(page_url);
    CREATE INDEX IF NOT EXISTS idx_sections_ts ON section_views(timestamp);

    CREATE TABLE IF NOT EXISTS cta_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, page_url TEXT NOT NULL,
      track_name TEXT NOT NULL, device_type TEXT, timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cta_url ON cta_clicks(page_url);
    CREATE INDEX IF NOT EXISTS idx_cta_name ON cta_clicks(track_name);
    CREATE INDEX IF NOT EXISTS idx_cta_ts ON cta_clicks(timestamp);
  `);
  console.log("DB initialized at", dbPath);
}

module.exports = { db, initDb };
