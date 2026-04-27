/*!
 * Lightweight Heatmap Tracker
 * Vanilla JS — batches events, respects privacy, no PII collection.
 *
 * Usage:
 *   <script>window.HEATMAP_ENDPOINT = "https://your-server.com/api/track";</script>
 *   <script src="https://your-server.com/tracker/tracker.js" async></script>
 */
(function () {
  "use strict";

  // ---- Config ---------------------------------------------------------------
  var ENDPOINT = window.HEATMAP_ENDPOINT || "/api/track";
  var BATCH_INTERVAL_MS = 5000;       // flush every 5s
  var BATCH_MAX_SIZE = 50;            // or when buffer hits this
  var SECTION_VISIBLE_THRESHOLD = 0.5; // 50% in view counts as "visible"
  var MIN_SECTION_TIME_MS = 500;       // ignore <0.5s glances

  // ---- Session --------------------------------------------------------------
  var STORAGE_KEY = "_hm_sid";
  var sessionId;
  try {
    sessionId = localStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      sessionId = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(STORAGE_KEY, sessionId);
    }
  } catch (e) {
    // localStorage blocked — fall back to in-memory id
    sessionId = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  // ---- Device / viewport ----------------------------------------------------
  var isMobile = /Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  var deviceType = isMobile ? "mobile" : "desktop";

  // ---- Buffer ---------------------------------------------------------------
  var buffer = [];
  var flushing = false;

  function pageUrl() {
    return location.pathname + location.search;
  }

  function push(ev) {
    ev.t = Date.now();
    ev.url = pageUrl();
    buffer.push(ev);
    if (buffer.length >= BATCH_MAX_SIZE) flush();
  }

  function buildPayload() {
    return {
      session: {
        id: sessionId,
        device_type: deviceType,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        user_agent: (navigator.userAgent || "").slice(0, 500),
        referrer: (document.referrer || "").slice(0, 500)
      },
      events: buffer.splice(0)
    };
  }

  function flush(useBeacon) {
    if (flushing || buffer.length === 0) return;
    flushing = true;
    var payload = buildPayload();
    var body = JSON.stringify(payload);
    try {
      if (useBeacon && navigator.sendBeacon) {
        var blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(ENDPOINT, blob);
      } else {
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true,
          credentials: "omit"
        }).catch(function () {});
      }
    } catch (e) {
      // swallow — never break the page
    }
    flushing = false;
  }

  // ---- Click tracking -------------------------------------------------------
  // SAFETY: skip inputs, textareas, selects, password fields, contentEditable,
  // and anything inside [data-no-track] or a <form> field.
  function isSensitive(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || tag === "option") return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest("input, textarea, select, [data-no-track], [type='password']")) return true;
    return false;
  }

  function describeElement(el) {
    if (!el || !el.tagName) return {};
    return {
      tag: el.tagName.toLowerCase(),
      id: (el.id || "").toString().slice(0, 100),
      cls: typeof el.className === "string" ? el.className.slice(0, 200) : "",
      // Only short visible text; never full innerHTML.
      txt: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80)
    };
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (isSensitive(target)) return;

    var info = describeElement(target);
    push({
      type: "click",
      x: Math.round(e.pageX),
      y: Math.round(e.pageY),
      vw: window.innerWidth,
      vh: window.innerHeight,
      tag: info.tag,
      id: info.id,
      cls: info.cls,
      txt: info.txt
    });

    // CTA tracking via [data-track]
    var trackEl = target.closest && target.closest("[data-track]");
    if (trackEl) {
      var name = trackEl.getAttribute("data-track");
      if (name) push({ type: "cta", track_name: name.slice(0, 100) });
    }
  }, true);

  // ---- Scroll depth ---------------------------------------------------------
  var milestones = { 25: false, 50: false, 75: false, 100: false };
  var maxScroll = 0;
  var scrollTicking = false;

  function getScrollPercent() {
    var doc = document.documentElement;
    var body = document.body;
    var scrollTop = doc.scrollTop || body.scrollTop || 0;
    var scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
    var clientHeight = doc.clientHeight || window.innerHeight;
    if (scrollHeight - clientHeight <= 0) return 100;
    return Math.min(100, Math.round(((scrollTop + clientHeight) / scrollHeight) * 100));
  }

  window.addEventListener("scroll", function () {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      var p = getScrollPercent();
      if (p > maxScroll) maxScroll = p;
      [25, 50, 75, 100].forEach(function (m) {
        if (!milestones[m] && p >= m) {
          milestones[m] = true;
          push({ type: "scroll", depth: m });
        }
      });
      scrollTicking = false;
    });
  }, { passive: true });

  // ---- Section visibility ---------------------------------------------------
  var sectionStart = {};   // name -> timestamp when it became visible
  var sectionTotal = {};   // name -> accumulated ms

  function flushSectionTimes() {
    // Close any currently-open sections so they get counted on flush.
    var now = Date.now();
    Object.keys(sectionStart).forEach(function (name) {
      sectionTotal[name] = (sectionTotal[name] || 0) + (now - sectionStart[name]);
      sectionStart[name] = now; // reset so we keep counting after flush
    });
    Object.keys(sectionTotal).forEach(function (name) {
      var dur = Math.round(sectionTotal[name]);
      if (dur >= MIN_SECTION_TIME_MS) {
        push({ type: "section", section_name: name, duration_ms: dur });
      }
      sectionTotal[name] = 0;
    });
  }

  function setupSectionObserver() {
    if (!("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var name = entry.target.getAttribute("data-section");
        if (!name) return;
        if (entry.isIntersecting) {
          if (!sectionStart[name]) sectionStart[name] = Date.now();
        } else if (sectionStart[name]) {
          sectionTotal[name] = (sectionTotal[name] || 0) + (Date.now() - sectionStart[name]);
          delete sectionStart[name];
        }
      });
    }, { threshold: SECTION_VISIBLE_THRESHOLD });

    function observeAll() {
      var els = document.querySelectorAll("[data-section]");
      for (var i = 0; i < els.length; i++) observer.observe(els[i]);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observeAll);
    } else {
      observeAll();
    }

    // Catch dynamically added sections (SPA-friendly)
    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function () { observeAll(); });
      mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  setupSectionObserver();

  // ---- Periodic flush -------------------------------------------------------
  setInterval(function () {
    flushSectionTimes();
    flush(false);
  }, BATCH_INTERVAL_MS);

  // ---- Page exit ------------------------------------------------------------
  function exitFlush() {
    push({ type: "max_scroll", depth: maxScroll });
    flushSectionTimes();
    flush(true);
  }

  window.addEventListener("pagehide", exitFlush);
  window.addEventListener("beforeunload", exitFlush);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      flushSectionTimes();
      flush(true);
    }
  });

  // ---- Initial register (so empty sessions still appear) --------------------
  push({ type: "pageview" });
  setTimeout(function () { flush(false); }, 800);
})();
