const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// ── פונקציה לשליפה מ-oref מצד השרת ──────────────────────
function fetchOref(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.oref.org.il',
      path: urlPath,
      method: 'GET',
      headers: {
        'Referer': 'https://www.oref.org.il/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'he-IL,he;q=0.9',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ── שרת HTTP ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {

  // CORS – allow any origin (browser can call us)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  // ── serve index.html ──────────────────────────────────
  if (url === '/' || url === '/index.html') {
    const file = path.join(__dirname, 'public', 'index.html');
    fs.readFile(file, (err, content) => {
      if (err) { res.writeHead(404); res.end('index.html not found'); return; }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(content);
    });
    return;
  }

  // ── /api/current – התראה פעילה כרגע ─────────────────
  if (url === '/api/current') {
    try {
      const raw = await fetchOref('/WarningMessages/alert/alerts.json');
      const trimmed = raw.trim();
      const data = trimmed ? JSON.parse(trimmed) : null;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, data, ts: Date.now() }));
    } catch (e) {
      console.error('[/api/current]', e.message);
      res.writeHead(502);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── /api/history – היסטוריית התראות ─────────────────
  if (url === '/api/history') {
    try {
      const raw = await fetchOref('/WarningMessages/History/AlertsHistory.json');
      const trimmed = raw.trim();
      const data = trimmed ? JSON.parse(trimmed) : [];
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, data, ts: Date.now() }));
    } catch (e) {
      console.error('[/api/history]', e.message);
      res.writeHead(502);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── /health – health check for Render ────────────────
  if (url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', ts: Date.now() }));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`✅  שרת רעננה פועל על http://localhost:${PORT}`);
  console.log(`📡  endpoints: /api/current  /api/history  /health`);
});
