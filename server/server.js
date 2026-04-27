const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { initDb } = require("./db");
const trackRouter = require("./routes/track");
const dashboardRouter = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Privacy: trust only forwarded protocol, never log raw IPs -------------
// We do NOT log or store the client IP anywhere. (Express has no built-in IP
// logging — we just never read req.ip into the database.)

// ---- CORS: allow all origins so you can track multiple domains -------------
// Tighten this in production by passing a list:
//   ALLOWED_ORIGINS="https://site1.com,https://site2.com" node server.js
const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowed.length ? allowed : true,
  methods: ["GET", "POST", "OPTIONS"],
  credentials: false
}));

app.use(express.json({ limit: "1mb" }));

// ---- Serve the tracker.js snippet at /tracker/tracker.js -------------------
app.use("/tracker", express.static(path.join(__dirname, "..", "tracker"), {
  maxAge: "1h",
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
}));

// ---- API -------------------------------------------------------------------
app.use("/api/track", trackRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- Serve dashboard build (if it exists) ----------------------------------
const dashDist = path.join(__dirname, "..", "dashboard", "dist");
if (fs.existsSync(dashDist)) {
  app.use(express.static(dashDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(dashDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send(
      "<h1>Heatmap server running</h1>" +
      "<p>Dashboard not built yet. Run <code>cd dashboard && npm install && npm run build</code>.</p>"
    );
  });
}

initDb();
app.listen(PORT, () => {
  console.log(`Heatmap server listening on :${PORT}`);
});
