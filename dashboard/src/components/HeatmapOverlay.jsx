import React, { useEffect, useRef, useState } from "react";

/**
 * Page-aware heatmap.
 *  - When no page is selected: shows a picker listing all tracked pages.
 *  - When a page is selected: renders the actual page in an iframe with click
 *    dots overlaid on top, plus a plain-English "Top click zones" list.
 *
 * Click coordinates from the tracker are PAGE coordinates (pageX/pageY) with
 * the viewport_width that was active when the click happened. We scale x by
 * (containerWidth / viewport_width) so dots land in the right horizontal spot
 * regardless of which device the visitor used.
 */
export default function HeatmapOverlay({ points, topClicks, currentPage, pages, onSelectPage }) {
  if (!currentPage) {
    return <PagePicker pages={pages} onSelectPage={onSelectPage} />;
  }
  return (
    <HeatmapWithPreview
      points={points}
      topClicks={topClicks}
      currentPage={currentPage}
      onClear={() => onSelectPage("")}
    />
  );
}

// ---------------------------------------------------------------------------
//  Page picker (shown when no page filter is active)
// ---------------------------------------------------------------------------
function PagePicker({ pages, onSelectPage }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Click heatmap</h3>
        <span className="card-meta">pick a page to view</span>
      </div>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24, fontSize: 13 }}>
        Heatmaps need a specific page to overlay clicks correctly.
        Pick a tracked page below to see its heatmap with the page itself shown as the background.
      </p>
      {!pages?.length ? (
        <div className="empty">No pages tracked yet — install the tracker on a landing page</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Page</th>
              <th style={{ width: 90, textAlign: "right" }}>Clicks</th>
              <th style={{ width: 90, textAlign: "right" }}>Sessions</th>
              <th style={{ width: 110 }}></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.page_url}>
                <td className="lead"><span className="tag">{p.page_url}</span></td>
                <td className="num">{p.clicks}</td>
                <td className="num">{p.sessions}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn"
                    style={{ padding: "6px 12px", fontSize: 11 }}
                    onClick={() => onSelectPage(p.page_url)}
                  >
                    View heatmap →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Heatmap visual (iframe + canvas overlay) + plain-English zones list
// ---------------------------------------------------------------------------
function HeatmapWithPreview({ points, topClicks, currentPage, onClear }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [device, setDevice] = useState("all");
  const [iframeFailed, setIframeFailed] = useState(false);

  const filtered = (points || []).filter((p) => {
    if (device !== "all" && p.device_type !== device) return false;
    return p.x != null && p.y != null && p.viewport_width;
  });

  // Decide page height: use max click y, fallback to 2x viewport.
  const maxY = filtered.reduce((m, p) => Math.max(m, p.y || 0), 0);
  const pageHeight = Math.max(800, maxY + 200);

  // Build iframe URL — page_url should look like "host/path" (v1.1 tracker).
  // Legacy data without host (just "/path") gets no iframe.
  const hasHost = currentPage && /^[^\/]+\.[^\/]+/.test(currentPage);
  const iframeUrl = hasHost ? `https://${currentPage}` : null;

  // Detect iframe load failure (X-Frame-Options / CSP frame-ancestors).
  // onError doesn't fire for these, so we use a timeout — if onLoad hasn't
  // fired in 4s, assume blocked.
  useEffect(() => {
    if (!iframeUrl) return;
    setIframeFailed(false);
    const t = setTimeout(() => setIframeFailed(true), 4000);
    return () => clearTimeout(t);
  }, [iframeUrl]);

  // Draw the heat blooms + click dots on the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;

    canvas.width = width * dpr;
    canvas.height = pageHeight * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = pageHeight + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, pageHeight);

    if (filtered.length === 0) return;

    // Heat blooms (additive blending = overlapping clicks brighten naturally)
    ctx.globalCompositeOperation = "lighter";
    filtered.forEach((p) => {
      const x = (p.x / p.viewport_width) * width;
      const y = p.y;
      if (x < 0 || x > width || y < 0 || y > pageHeight) return;

      const radius = 32;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, "rgba(255, 107, 31, 0.55)");
      grad.addColorStop(0.4, "rgba(255, 140, 60, 0.25)");
      grad.addColorStop(1, "rgba(255, 200, 80, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Crisp dot at the actual click point
    ctx.globalCompositeOperation = "source-over";
    filtered.forEach((p) => {
      const x = (p.x / p.viewport_width) * width;
      const y = p.y;
      if (x < 0 || x > width || y < 0 || y > pageHeight) return;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [filtered, pageHeight, currentPage]);

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title" style={{ marginBottom: 4 }}>Click heatmap</h3>
            <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "var(--accent-soft)" }}>
              {currentPage}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["all", "desktop", "mobile"].map((d) => (
              <button
                key={d}
                className="btn btn-ghost"
                style={{
                  padding: "6px 12px",
                  fontSize: 11,
                  background: device === d ? "var(--bg-elev-2)" : "transparent",
                  color: device === d ? "var(--ink)" : "var(--ink-soft)"
                }}
                onClick={() => setDevice(d)}
              >
                {d}
              </button>
            ))}
            <button
              className="btn btn-ghost"
              style={{ padding: "6px 12px", fontSize: 11 }}
              onClick={onClear}
            >
              ← Pages
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: "0 0 16px", fontFamily: "JetBrains Mono, monospace" }}>
          {filtered.length} click points · scroll the panel to see the lower part of the page
        </p>

        <div
          ref={containerRef}
          style={{
            position: "relative",
            width: "100%",
            height: 700,
            overflow: "auto",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "var(--bg-elev-2)"
          }}
        >
          <div style={{ position: "relative", width: "100%", height: pageHeight }}>
            {iframeUrl ? (
              <iframe
                title="Page preview"
                src={iframeUrl}
                onLoad={() => setIframeFailed(false)}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  pointerEvents: "none",
                  opacity: 0.55,
                  background: "#fff"
                }}
              />
            ) : (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink-mute)", fontSize: 13, fontFamily: "JetBrains Mono, monospace",
                textAlign: "center", padding: 24
              }}>
                Page preview unavailable<br/>
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  Legacy URL has no hostname — heatmap dots shown without page background
                </span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
            />
          </div>
        </div>

        {iframeUrl && iframeFailed && (
          <div style={{
            marginTop: 12, padding: "10px 14px",
            background: "rgba(231, 111, 81, 0.1)",
            border: "1px solid rgba(231, 111, 81, 0.3)",
            borderRadius: "var(--radius)",
            fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5
          }}>
            <strong style={{ color: "var(--warn)" }}>Page preview may be blocked.</strong>{" "}
            If you only see a blank background, your landing page is sending an
            <code style={{ padding: "0 4px", background: "var(--bg-elev-2)", borderRadius: 3 }}>X-Frame-Options</code> or
            <code style={{ padding: "0 4px", background: "var(--bg-elev-2)", borderRadius: 3 }}>Content-Security-Policy</code> header
            that prevents embedding. The dots overlay still works correctly.
            To enable preview, allow framing from{" "}
            <code style={{ padding: "0 4px", background: "var(--bg-elev-2)", borderRadius: 3 }}>{window.location.origin}</code>{" "}
            on your landing page server.
          </div>
        )}
      </div>

      {/* Plain-English top click zones */}
      <TopClickZones rows={topClicks} />
    </>
  );
}

// ---------------------------------------------------------------------------
//  Plain-English "Top click zones" — friendlier read of where attention goes
// ---------------------------------------------------------------------------
function TopClickZones({ rows }) {
  const list = (rows || []).slice(0, 10);
  const total = list.reduce((a, r) => a + r.clicks, 0);

  function describe(r) {
    if (r.element_text && r.element_text.length > 1) return `"${r.element_text}"`;
    if (r.element_id) return `${r.element_tag} (#${r.element_id})`;
    if (r.element_class) {
      const first = String(r.element_class).split(/\s+/)[0];
      if (first) return `${r.element_tag}.${first}`;
    }
    return `${r.element_tag} element`;
  }

  function isClickable(r) {
    return ["a", "button", "input", "label", "select"].includes((r.element_tag || "").toLowerCase());
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <h3 className="card-title">Top click zones</h3>
        <span className="card-meta">in plain english</span>
      </div>
      {!list.length ? (
        <div className="empty">No clicks recorded yet</div>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map((r, i) => {
            const pct = total ? Math.round((r.clicks / total) * 100) : 0;
            const suspicious = !isClickable(r) && r.clicks >= 5;
            return (
              <li
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 4px",
                  borderBottom: i < list.length - 1 ? "1px solid var(--line-soft)" : "none"
                }}
              >
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  color: "var(--ink-mute)",
                  fontStyle: "italic",
                  width: 28,
                  textAlign: "center"
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "var(--ink)", marginBottom: 2 }}>
                    {suspicious && <span style={{ color: "var(--warn)" }}>⚠ </span>}
                    {describe(r)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-mute)", fontFamily: "JetBrains Mono, monospace" }}>
                    &lt;{r.element_tag}&gt;
                    {r.element_id ? `#${r.element_id}` : ""}
                    {suspicious && " · not normally clickable — check if users expect it to be"}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 70 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--ink)" }}>
                    {r.clicks}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>
                    {pct}% · {r.sessions} ppl
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
