const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

/**
 * פונקציה לשליפת נתונים מפיקוד העורף
 * כולל Headers מתקדמים כדי לנסות לעקוף חסימות
 */
function fetchOref(urlPath) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.oref.org.il',
            path: urlPath,
            method: 'GET',
            headers: {
                'Referer': 'https://www.oref.org.il/he/alerts-history',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Oref Error: ${res.statusCode}`));
                    return;
                }
                resolve(data);
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

/**
 * פונקציה לעיבוד הנתונים וסינון רעננה
 */
function processRaananaData(rawData) {
    try {
        const trimmed = rawData.trim();
        // אם התו הראשון הוא <, זה אומר שקיבלנו דף HTML (חסימה) במקום JSON
        if (trimmed.startsWith('<')) {
            throw new Error("Blocked by Oref (HTML received)");
        }
        
        const allAlerts = JSON.parse(trimmed);
        if (!Array.isArray(allAlerts)) return [];

        // סינון התראות שכוללות את המילה "רעננה"
        const raananaAlerts = allAlerts.filter(alert => 
            alert.data && alert.data.includes('רעננה')
        );

        return raananaAlerts;
    } catch (e) {
        throw e;
    }
}

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = req.url.split('?')[0];

    // דף הבית
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

    // API: התראות אחרונות ברעננה
    if (url === '/api/history') {
        try {
            const raw = await fetchOref('/WarningMessages/History/AlertsHistory.json');
            const alerts = processRaananaData(raw);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify({
                ok: true,
                count: alerts.length,
                lastAlert: alerts.length > 0 ? alerts[0] : null, // ההתראה האחרונה ביותר
                data: alerts,
                ts: Date.now()
            }));
        } catch (e) {
            console.error('[/api/history] error:', e.message);
            res.writeHead(502);
            res.end(JSON.stringify({ 
                ok: false, 
                error: "Unable to fetch from Oref",
                details: e.message 
            }));
        }
        return;
    }

    // API: בדיקת התראה פעילה כרגע ברעננה
    if (url === '/api/current') {
        try {
            const raw = await fetchOref('/WarningMessages/alert/alerts.json');
            const data = (raw.trim() && !raw.trim().startsWith('<')) ? JSON.parse(raw) : null;
            
            // בדיקה אם רעננה נמצאת בתוך רשימת הערים הפעילות
            const isRaananaActive = data && data.data && data.data.some(city => city.includes('רעננה'));

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify({ 
                ok: true, 
                active: !!isRaananaActive, 
                raw: isRaananaActive ? data : null 
            }));
        } catch (e) {
            res.writeHead(200); // מחזירים 200 כדי לא לשבור את הקליינט, פשוט בלי דאטה
            res.end(JSON.stringify({ ok: false, active: false }));
        }
        return;
    }

    // Health check
    if (url === '/health') {
        res.writeHead(200);
        res.end('OK');
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
