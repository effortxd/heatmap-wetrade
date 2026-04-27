import React, { useEffect, useRef, useState } from "react";

/**
 * Heatmap overlay.
 * Normalizes click coordinates to the current canvas width using each
 * click's stored viewport_width, then draws radial gradients with additive
 * blending to produce a heat effect.
 */
export default function HeatmapOverlay({ points }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [device, setDevice] = useState("all");

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;

    canvas.width = stageW * dpr;
    canvas.height = stageH * dpr;
    canvas.style.width = stageW + "px";
    canvas.style.height = stageH + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, stageW, stageH);

    const filtered = (points || []).filter((p) => {
      if (device !== "all" && p.device_type !== device) return false;
      return p.x != null && p.y != null && p.viewport_width;
    });

    if (filtered.length === 0) return;

    // Compute the maximum y we have so the canvas can scale to the page height
    // proportionally. We use a virtual page height based on the max y observed.
    const maxYRatio = Math.max(
      ...filtered.map((p) => p.y / Math.max(p.viewport_height || 1, 600))
    );
    const virtualPageHeight = Math.max(stageH, stageH * maxYRatio);

    ctx.globalCompositeOperation = "lighter";

    filtered.forEach((p) => {
      const xRatio = p.x / p.viewport_width;
      const yRatio = p.y / Math.max(p.viewport_height || 1, 600);
      const cx = xRatio * stageW;
      const cy = yRatio * stageH; // map relative to the visible viewport-equivalent

      if (cx < 0 || cx > stageW || cy < 0 || cy > stageH) return;

      const radius = 36;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0,    "rgba(255, 107, 31, 0.55)");
      grad.addColorStop(0.4,  "rgba(255, 140, 60, 0.25)");
      grad.addColorStop(1,    "rgba(255, 200, 80, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Add small dots at exact click points
    ctx.globalCompositeOperation = "source-over";
    filtered.forEach((p) => {
      const xRatio = p.x / p.viewport_width;
      const yRatio = p.y / Math.max(p.viewport_height || 1, 600);
      const cx = xRatio * stageW;
      const cy = yRatio * stageH;
      if (cx < 0 || cx > stageW || cy < 0 || cy > stageH) return;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    // virtualPageHeight isn't used yet but kept for future scrollable view
    void virtualPageHeight;
  }, [points, device]);

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">Click heatmap</h3>
        <div style={{ display: "flex", gap: 8 }}>
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
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: "0 0 16px", fontFamily: "JetBrains Mono, monospace" }}>
        {points?.length || 0} click points · normalized to viewport
      </p>
      <div ref={stageRef} className="heatmap-stage">
        <canvas ref={canvasRef} className="heatmap-canvas" />
      </div>
    </div>
  );
}
