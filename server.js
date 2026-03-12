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
        'Referer': 'https://www.oref.org.il/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive'
      },
    };
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Oref returned status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.setTimeout(10000);
    req.end();
  });
}

function safeJSON(raw) {
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('<')) throw new Error("Received HTML instead of JSON (Blocked by Oref)");
    return trimmed ? JSON.parse(trimmed) : null;
  } catch (e) {
    throw new Error("JSON Parse Error: " + e.message);
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

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

  if (url === '/api/current' || url === '/api/history') {
    const apiPath = url === '/api/current'
      ? '/WarningMessages/alert/alerts.json'
      : '/WarningMessages/History/AlertsHistory.json';
    try {
      const raw = await fetchOref(apiPath);
      const data = safeJSON(raw);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, data, ts: Date.now() }));
    } catch (e) {
      console.error(`[${url}] Error:`, e.message);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
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

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`✅ שרת פועל על פורט ${PORT}`);
});
