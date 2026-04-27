const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { initDb } = require("./db");

// Initialize DB schema BEFORE loading routes (routes call db.prepare at load time)
initDb();

const trackRouter = require("./routes/track");
const dashboardRouter = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 3001;

const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowed.length ? allowed : true,
  methods: ["GET", "POST", "OPTIONS"],
  credentials: false
}));

app.use(express.json({ limit: "1mb" }));

app.use("/tracker", express.static(path.join(__dirname, "..", "tracker"), {
  maxAge: "1h",
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}));

app.use("/api/track", trackRouter);
app.use("/api/dashboard", dashboardRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

const dashDist = path.join(__dirname, "..", "dashboard", "dist");
if (fs.existsSync(dashDist)) {
  app.use(express.static(dashDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(dashDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send("<h1>Heatmap server running</h1>");
  });
}

app.listen(PORT, () => {
  console.log(`Heatmap server listening on :${PORT}`);
});
