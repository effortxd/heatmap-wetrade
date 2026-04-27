const BASE = import.meta.env.VITE_API_BASE || "";

function qs(params) {
  const cleaned = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return cleaned ? `?${cleaned}` : "";
}

async function get(path, params) {
  const res = await fetch(`${BASE}/api/dashboard${path}${qs(params)}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  summary:     (p) => get("/summary", p),
  devices:     (p) => get("/devices", p),
  topClicks:   (p) => get("/top-clicks", p),
  scrollDepth: (p) => get("/scroll-depth", p),
  sectionTime: (p) => get("/section-time", p),
  cta:         (p) => get("/cta", p),
  heatmap:     (p) => get("/heatmap", p),
  pages:       ()  => get("/pages")
};
