const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

function fetchOref(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.oref.org.il',
      path: urlPath,
      method: 'GET',
      headers: {
        'Host': 'www.oref.org.il',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'identity',
        'Referer': 'https://www.oref.org.il/12481-he/Pakar.aspx',
        'Origin': 'https://www.oref.org.il',
        'X-Requested-With': 'XMLHttpRequest',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    };

    const req = https.request(options, (res) => {
      console.log(`[oref] ${urlPath} → HTTP ${res.statusCode} | CT: ${res.headers['content-type']}`);

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`[oref] redirect → ${res.headers.location}`);
        const loc = res.headers.location;
        const u = new URL(loc.startsWith('http') ? loc : `https://www.oref.org.il${loc}`);
        const opts2 = { hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
          headers: options.headers };
        const req2 = https.request(opts2, (res2) => {
          let d = ''; res2.setEncoding('utf8');
          res2.on('data', c => d += c);
          res2.on('end', () => resolve(d));
        });
        req2.on('error', reject); req2.end(); return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.trim().startsWith('<')) {
          console.error(`[oref] HTML במקום JSON: ${data.substring(0, 300)}`);
          reject(new Error('oref returned HTML (blocked)'));
        } else {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => { console.error(`[oref] network error: ${e.message}`); reject(e); });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function fetchCurrent() {
  const paths = [
    '/WarningMessages/alert/alerts.json',
    '/alerts/alerts.json',
  ];
  for (const p of paths) {
    try {
      const raw = await fetchOref(p);
      return raw.trim() ? JSON.parse(raw) : null;
    } catch (e) { console.log(`[current] failed ${p}: ${e.message}`); }
  }
  return null;
}

async function fetchHistory() {
  const paths = [
    '/WarningMessages/History/AlertsHistory.json',
    '/Shared/Ajax/GetAlertsHistory.aspx?lang=he',
  ];
  for (const p of paths) {
    try {
      const raw = await fetchOref(p);
      if (!raw.trim()) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.data || parsed.alerts || []);
    } catch (e) { console.log(`[history] failed ${p}: ${e.message}`); }
  }
  return [];
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  if (url === '/' || url === '/index.html') {
    const tryFiles = [
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'public', 'index.html'),
    ];
    for (const f of tryFiles) {
      if (fs.existsSync(f)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(200); res.end(fs.readFileSync(f)); return;
      }
    }
    res.writeHead(404); res.end('index.html not found'); return;
  }

  if (url === '/api/current') {
    try {
      const data = await fetchCurrent();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, data, ts: Date.now() }));
    } catch (e) {
      res.writeHead(502);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (url === '/api/history') {
    try {
      const data = await fetchHistory();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, data, ts: Date.now() }));
    } catch (e) {
      res.writeHead(502);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', ts: Date.now() }));
    return;
  }

  if (url === '/debug') {
    try {
      const raw = await fetchOref('/WarningMessages/History/AlertsHistory.json');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.writeHead(200);
      res.end(`Length: ${raw.length}\nFirst 500:\n${raw.substring(0, 500)}`);
    } catch (e) {
      res.writeHead(500); res.end(`Error: ${e.message}`);
    }
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, () => {
  console.log(`✅  שרת רעננה פועל על http://localhost:${PORT}`);
  console.log(`📡  /api/current  /api/history  /health  /debug`);
});
