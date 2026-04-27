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

async function exportCsv(params) {
  const url = `${BASE}/api/dashboard/export${qs(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const blob = await res.blob();

  // Filename: heatmap_YYYY-MM-DD_to_YYYY-MM-DD[_<page>].csv
  const fmt = (ms) => new Date(ms).toISOString().slice(0, 10);
  const fromStr = params.from ? fmt(params.from) : "all";
  const toStr = params.to ? fmt(params.to) : "all";
  const pageStr = params.page
    ? "_" + String(params.page).replace(/[^a-zA-Z0-9.-]/g, "_")
    : "";
  const filename = `heatmap_${fromStr}_to_${toStr}${pageStr}.csv`;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export const api = {
  summary:     (p) => get("/summary", p),
  devices:     (p) => get("/devices", p),
  topClicks:   (p) => get("/top-clicks", p),
  scrollDepth: (p) => get("/scroll-depth", p),
  sectionTime: (p) => get("/section-time", p),
  cta:         (p) => get("/cta", p),
  heatmap:     (p) => get("/heatmap", p),
  pages:       ()  => get("/pages"),
  exportCsv
};
