import React, { useEffect, useState, useCallback } from "react";
import { api } from "./api";

import Filters from "./components/Filters.jsx";
import StatCards from "./components/StatCards.jsx";
import TopClicks from "./components/TopClicks.jsx";
import ScrollChart from "./components/ScrollChart.jsx";
import SectionTime from "./components/SectionTime.jsx";
import DeviceBreakdown from "./components/DeviceBreakdown.jsx";
import CTAReport from "./components/CTAReport.jsx";
import HeatmapOverlay from "./components/HeatmapOverlay.jsx";

export default function App() {
  // Default range: last 30 days
  const [filters, setFilters] = useState(() => {
    const to = Date.now();
    const from = to - 30 * 24 * 60 * 60 * 1000;
    return { from, to, page: undefined };
  });

  const [pages, setPages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [topClicks, setTopClicks] = useState([]);
  const [scrollDepth, setScrollDepth] = useState([]);
  const [sectionTime, setSectionTime] = useState([]);
  const [cta, setCta] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, tc, sd, st, ct, hm, pg] = await Promise.all([
        api.summary(filters),
        api.devices(filters),
        api.topClicks(filters),
        api.scrollDepth(filters),
        api.sectionTime(filters),
        api.cta(filters),
        api.heatmap(filters),
        api.pages()
      ]);
      setSummary(s);
      setDevices(d);
      setTopClicks(tc);
      setScrollDepth(sd);
      setSectionTime(st);
      setCta(ct);
      setHeatmap(hm);
      setPages(pg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setPage = (p) =>
    setFilters((f) => ({ ...f, page: p || undefined }));

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await api.exportCsv(filters);
    } catch (e) {
      console.error(e);
      alert("Export failed: " + (e.message || "unknown error"));
    } finally {
      setExporting(false);
    }
  }, [filters]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <img
            src="/wetrade-logo.png"
            alt="WeTrade"
            style={{ width: "100%", maxWidth: 180, marginBottom: 12 }}
          />
          <div className="brand-sub">Behaviour analytics</div>
        </div>

        <div>
          <div className="side-section">Reports</div>
          <a className="side-link active" href="#overview">Overview</a>
          <a className="side-link" href="#heatmap">Click heatmap</a>
          <a className="side-link" href="#scroll">Scroll &amp; sections</a>
          <a className="side-link" href="#cta">CTA performance</a>
        </div>

        <div className="sidebar-foot">
          v1.2.0<br />
          {loading ? "Loading…" : "Idle"}
        </div>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <h1 className="page-title">
              Behaviour <em>at a glance</em>
            </h1>
            <div className="page-sub">Sessions · clicks · scroll · CTAs</div>
          </div>
          <Filters
            filters={filters}
            setFilters={setFilters}
            pages={pages}
            onRefresh={load}
            onExport={handleExport}
            exporting={exporting}
          />
        </header>

        <section id="overview">
          <StatCards summary={summary} />
        </section>

        <section className="grid-3">
          <TopClicks rows={topClicks} />
          <DeviceBreakdown rows={devices} />
        </section>

        <section className="grid-2" id="scroll">
          <ScrollChart rows={scrollDepth} totalSessions={summary?.totalSessions} />
          <SectionTime rows={sectionTime} />
        </section>

        <section id="cta" style={{ marginBottom: 16 }}>
          <CTAReport rows={cta} />
        </section>

        <section id="heatmap">
          <HeatmapOverlay
            points={heatmap}
            topClicks={topClicks}
            currentPage={filters.page}
            pages={pages}
            onSelectPage={setPage}
          />
        </section>

        <footer style={{ marginTop: 48, padding: "24px 0", borderTop: "1px solid var(--line-soft)", color: "var(--ink-mute)", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
          No IPs · no PII · all data stored locally in SQLite
        </footer>
      </main>
    </div>
  );
}
