#!/bin/bash
# WeTrade Heatmap v1.2 deployment script
# - Adds Mobile/Desktop heatmap preview that resizes iframe in sync with device toggle
# - Adds Export CSV button that downloads a multi-section report respecting filters
# - Fixes button click affordance (cursor, hover, press states)
# - Adds mobile responsive layout for filter bar
# - Disables sendBeacon (CORS issue) — fetch keepalive handles page-exit flush
#
# Run from inside this extracted directory on the droplet.
# Idempotent: re-running is safe.

set -euo pipefail

ROOT=/var/www/heatmap-wetrade
SRC=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP=$ROOT/.backup-$STAMP

echo "==> Heatmap v1.2 deploy  ($STAMP)"
echo "    source: $SRC"
echo "    target: $ROOT"
echo

if [ ! -d "$ROOT" ]; then
  echo "ERROR: $ROOT not found. Run this on the droplet." >&2
  exit 1
fi

# ---- 1. Backup ----
echo "==> Backing up to $BACKUP"
mkdir -p "$BACKUP/dashboard/src/components" "$BACKUP/server/routes" "$BACKUP/tracker"
cp "$ROOT/dashboard/src/App.jsx"                          "$BACKUP/dashboard/src/" 2>/dev/null || true
cp "$ROOT/dashboard/src/api.js"                           "$BACKUP/dashboard/src/" 2>/dev/null || true
cp "$ROOT/dashboard/src/styles.css"                       "$BACKUP/dashboard/src/" 2>/dev/null || true
cp "$ROOT/dashboard/src/components/Filters.jsx"           "$BACKUP/dashboard/src/components/" 2>/dev/null || true
cp "$ROOT/dashboard/src/components/HeatmapOverlay.jsx"    "$BACKUP/dashboard/src/components/" 2>/dev/null || true
cp "$ROOT/server/routes/dashboard.js"                     "$BACKUP/server/routes/" 2>/dev/null || true
cp "$ROOT/tracker/tracker.js"                             "$BACKUP/tracker/" 2>/dev/null || true
echo "    backup OK"

# ---- 2. Copy new dashboard + server files ----
echo "==> Installing v1.2 files"
cp "$SRC/dashboard/src/App.jsx"                           "$ROOT/dashboard/src/App.jsx"
cp "$SRC/dashboard/src/api.js"                            "$ROOT/dashboard/src/api.js"
cp "$SRC/dashboard/src/components/Filters.jsx"            "$ROOT/dashboard/src/components/Filters.jsx"
cp "$SRC/dashboard/src/components/HeatmapOverlay.jsx"     "$ROOT/dashboard/src/components/HeatmapOverlay.jsx"
cp "$SRC/server/routes/dashboard.js"                      "$ROOT/server/routes/dashboard.js"

# ---- 3. Append CSS additions (only if not already present) ----
echo "==> Patching styles.css"
if grep -q "v1.2 additions" "$ROOT/dashboard/src/styles.css"; then
  echo "    already patched, skipping"
else
  cat "$SRC/dashboard/src/styles.append.css" >> "$ROOT/dashboard/src/styles.css"
  echo "    appended"
fi

# ---- 4. Fix sendBeacon CORS issue (kill the beacon branch) ----
echo "==> Patching tracker.js (disable sendBeacon)"
if grep -q "if (false && navigator.sendBeacon)" "$ROOT/tracker/tracker.js"; then
  echo "    already patched, skipping"
else
  sed -i 's|if (useBeacon && navigator.sendBeacon)|if (false \&\& navigator.sendBeacon)|' "$ROOT/tracker/tracker.js"
  echo "    patched"
fi

# ---- 5. Build dashboard ----
echo "==> Building dashboard (npm run build)"
cd "$ROOT/dashboard"
npm run build

# ---- 6. Reload PM2 ----
echo "==> Reloading PM2"
pm2 reload heatmap

echo
echo "============================================================"
echo "  v1.2 deployed successfully"
echo "============================================================"
echo
echo "  Backup at: $BACKUP"
echo
echo "  Next steps:"
echo "  1. Hard-refresh dashboard:  Ctrl+Shift+R"
echo "  2. Bump tracker cache version on landing pages:"
echo "       <script src=\".../tracker.js?v=3\" async></script>"
echo "  3. Test:"
echo "       - Click 24h / 7d / 30d / Refresh — should respond visibly"
echo "       - Click 'Export CSV' — should download a CSV file"
echo "       - Open a heatmap page → click 'mobile' toggle"
echo "         iframe should shrink to phone width and show mobile layout"
echo
echo "  Rollback if needed:"
echo "    cp $BACKUP/dashboard/src/App.jsx                       $ROOT/dashboard/src/"
echo "    cp $BACKUP/dashboard/src/api.js                        $ROOT/dashboard/src/"
echo "    cp $BACKUP/dashboard/src/styles.css                    $ROOT/dashboard/src/"
echo "    cp $BACKUP/dashboard/src/components/Filters.jsx        $ROOT/dashboard/src/components/"
echo "    cp $BACKUP/dashboard/src/components/HeatmapOverlay.jsx $ROOT/dashboard/src/components/"
echo "    cp $BACKUP/server/routes/dashboard.js                  $ROOT/server/routes/"
echo "    cp $BACKUP/tracker/tracker.js                          $ROOT/tracker/"
echo "    cd $ROOT/dashboard && npm run build && cd .. && pm2 reload heatmap"
echo
