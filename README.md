# Heatmap Tracker

Lightweight, self-hosted website behaviour analytics. Track clicks, scroll depth, section visibility, and CTA performance across your landing pages with a single JS snippet — no third-party services, no cookies sold.

```
heatmap-tracker/
├── README.md
├── tracker/
│   └── tracker.js              ← the snippet you paste into your site
├── server/
│   ├── package.json
│   ├── server.js               ← Express entrypoint
│   ├── db.js                   ← SQLite + schema
│   ├── routes/
│   │   ├── track.js            ← POST /api/track  (ingest)
│   │   └── dashboard.js        ← GET  /api/dashboard/* (analytics)
│   └── data/                   ← heatmap.db lives here (auto-created)
├── dashboard/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── styles.css
│       └── components/
│           ├── Filters.jsx
│           ├── StatCards.jsx
│           ├── TopClicks.jsx
│           ├── ScrollChart.jsx
│           ├── SectionTime.jsx
│           ├── DeviceBreakdown.jsx
│           ├── CTAReport.jsx
│           └── HeatmapOverlay.jsx
├── examples/
│   └── landing-page.html       ← reference landing page with attributes
└── deployment/
    ├── ecosystem.config.js     ← PM2 process definition
    └── nginx.conf.example      ← reverse proxy template
```

---

## What gets tracked

| Feature | How |
|---|---|
| **Clicks** | x/y page coords, element tag/id/class/text, viewport size, device type, timestamp |
| **Scroll depth** | 25/50/75/100 milestones + max-scroll-per-session |
| **Section visibility** | Time-in-view per `[data-section]`, via IntersectionObserver |
| **CTA clicks** | Aggregated by `[data-track="..."]` name, split by device |
| **Sessions** | Anonymous ID via `localStorage` (no cookie banner needed in most jurisdictions) |

**What is NOT tracked:** form inputs, passwords, contentEditable content, any element inside `[data-no-track]`, IP addresses, full page HTML. Element text is capped at 80 chars.

---

## Quick start (local)

You'll need Node.js 18+.

```bash
# 1 — Backend
cd server
npm install
npm start                    # listens on :3001

# 2 — Dashboard (in a second terminal)
cd dashboard
npm install
npm run dev                  # opens http://localhost:5173

# 3 — Test it
# Open examples/landing-page.html in a browser, click around,
# then refresh the dashboard.
```

---

## Adding the tracker to your site

Paste these two lines before `</body>`:

```html
<script>window.HEATMAP_ENDPOINT = "https://analytics.yourdomain.com/api/track";</script>
<script src="https://analytics.yourdomain.com/tracker/tracker.js" async></script>
```

That's it — clicks and scroll depth are tracked automatically.

### Tracking sections (time on each part of the page)

Add a `data-section` attribute to anything you want to measure visibility for:

```html
<section data-section="hero">           …  </section>
<section data-section="leaderboard">    …  </section>
<section data-section="benefits">       …  </section>
<section data-section="deposit_cta">    …  </section>
```

### Tracking CTAs (button performance)

Add `data-track` to any clickable element:

```html
<button data-track="register_click">Open free account</button>
<button data-track="deposit_click">Deposit now</button>
<button data-track="login_click">Login</button>
<a href="/promo" data-track="promo_banner_click">Learn more</a>
```

### Excluding elements from tracking

```html
<div data-no-track>
  <!-- nothing inside here generates click events -->
</div>
```

Inputs, textareas, selects, password fields, and contentEditable are excluded automatically.

---

## Deploying to DigitalOcean

The cheapest, simplest path: a **$6/month basic Droplet** (1 vCPU, 1 GB RAM) running Ubuntu 22.04 + PM2 + Nginx. SQLite is local-disk only, so a single Droplet is the right shape.

### 1. Create the Droplet

- Region: closest to your traffic
- Image: Ubuntu 22.04 LTS x64
- Size: Basic · Regular · $6/mo (1 GB / 1 CPU)
- Add your SSH key

### 2. Initial server setup

```bash
ssh root@YOUR_DROPLET_IP

# System packages
apt update && apt upgrade -y
apt install -y git nginx ufw build-essential

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2 (process manager)
npm install -g pm2

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### 3. Deploy the code

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/YOUR_USER/heatmap-tracker.git
# OR upload via scp/rsync:
#   rsync -avz ./heatmap-tracker root@YOUR_DROPLET_IP:/var/www/

cd /var/www/heatmap-tracker

# Install backend deps
cd server && npm install --omit=dev && cd ..

# Build the dashboard
cd dashboard && npm install && npm run build && cd ..
```

### 4. Start with PM2

```bash
cd /var/www/heatmap-tracker
pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup        # follow the printed command to enable boot-start
```

Check it's alive:

```bash
curl http://127.0.0.1:3001/api/health
# → {"ok":true,"ts":...}
```

### 5. Nginx + your subdomain

Point `analytics.yourdomain.com` (an A record) at your Droplet IP, then:

```bash
cp /var/www/heatmap-tracker/deployment/nginx.conf.example \
   /etc/nginx/sites-available/heatmap

# Edit the server_name line:
nano /etc/nginx/sites-available/heatmap

ln -s /etc/nginx/sites-available/heatmap /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 6. HTTPS (free, auto-renews)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d analytics.yourdomain.com
```

### 7. Lock down CORS to your domains (optional but recommended)

Edit `deployment/ecosystem.config.js` and set:

```js
env: {
  NODE_ENV: "production",
  PORT: 3001,
  ALLOWED_ORIGINS: "https://site1.com,https://site2.com,https://site3.com"
}
```

Then: `pm2 reload heatmap`.

### 8. Add the snippet to your landing pages

```html
<script>window.HEATMAP_ENDPOINT = "https://analytics.yourdomain.com/api/track";</script>
<script src="https://analytics.yourdomain.com/tracker/tracker.js" async></script>
```

Visit `https://analytics.yourdomain.com` to see the dashboard.

---

## Backups

The entire database is one file: `server/data/heatmap.db`. Back it up:

```bash
# Manual snapshot
cp /var/www/heatmap-tracker/server/data/heatmap.db ~/heatmap-$(date +%F).db

# Daily cron — add to crontab -e
0 3 * * * cp /var/www/heatmap-tracker/server/data/heatmap.db /root/backups/heatmap-$(date +\%F).db
```

DigitalOcean's weekly Droplet backups ($1.20/mo for the $6 plan) cover this too.

---

## Privacy & compliance notes

- **No IP storage.** The server never reads or persists `req.ip`.
- **No cookies.** Session ID lives in `localStorage`. Most jurisdictions consider this functional, not tracking — but check your own legal requirements.
- **No PII.** Form fields, password inputs, and any `[data-no-track]` subtree are skipped client-side. Element text is truncated to 80 characters.
- **First-party hosting.** All data stays on your Droplet. Nothing is sent to third parties.

---

## Performance

- The tracker is ~5 KB minified, loads `async`, and uses `requestAnimationFrame` for scroll handling and `IntersectionObserver` for sections.
- Events are batched — at most one network request every 5 seconds per visitor (or when 50 events queue up).
- On page exit, remaining events flush via `navigator.sendBeacon` so nothing is lost.
- SQLite + WAL mode handles thousands of inserts per second on a basic Droplet.

---

## Common operations

```bash
# View logs
pm2 logs heatmap

# Restart after config change
pm2 reload heatmap

# Update code
cd /var/www/heatmap-tracker
git pull
cd server && npm install --omit=dev && cd ..
cd dashboard && npm install && npm run build && cd ..
pm2 reload heatmap

# Wipe the database (start fresh)
pm2 stop heatmap
rm /var/www/heatmap-tracker/server/data/heatmap.db
pm2 start heatmap
```
