const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3001;

// Supabase config from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SAVE_SLOT = 'default'; // Single save slot key

// Helper: call Supabase REST API
function supabaseRequest(method, endpoint, body, callback) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            try {
                callback(null, JSON.parse(data), res.statusCode);
            } catch (e) {
                callback(e, null, res.statusCode);
            }
        });
    });

    req.on('error', callback);

    if (body) {
        req.write(JSON.stringify(body));
    }
    req.end();
}

// Helper to send static files
const sendFile = (res, filePath, contentType) => {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
};

const server = http.createServer((req, res) => {
    console.log(`Request for ${req.url} [${req.method}]`);

    // SAVE game state → upsert do Supabase
    if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const gameData = JSON.parse(body);

                // Upsert: pokud záznam existuje, updatuje; jinak vloží nový
                const endpoint = `gamestate?slot=eq.${SAVE_SLOT}`;
                supabaseRequest('PATCH', endpoint, { data: gameData, updated_at: new Date().toISOString() }, (err, result, status) => {
                    if (err || (status !== 200 && status !== 201 && status !== 204)) {
                        // Pokud řádek neexistuje (0 updated), vložíme nový
                        supabaseRequest('POST', 'gamestate', { slot: SAVE_SLOT, data: gameData, updated_at: new Date().toISOString() }, (err2, result2, status2) => {
                            if (err2 || (status2 !== 200 && status2 !== 201)) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: 'Error saving game state.' }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Game state saved successfully.' }));
                        });
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Game state saved successfully.' }));
                });
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid JSON format.' }));
            }
        });
        return;
    }

    // LOAD game state ← načti z Supabase
    if (req.url === '/api/load' && req.method === 'GET') {
        supabaseRequest('GET', `gamestate?slot=eq.${SAVE_SLOT}&select=data`, null, (err, result, status) => {
            if (err || status !== 200) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Error loading game state.' }));
                return;
            }
            // Výsledek je pole; pokud prázdné, vrátíme {}
            if (!result || result.length === 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({}));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result[0].data));
        });
        return;
    }

    // Static files
    switch (req.url) {
        case '/':
            sendFile(res, path.join(__dirname, 'index.html'), 'text/html');
            break;
        case '/style.css':
            sendFile(res, path.join(__dirname, 'style.css'), 'text/css');
            break;
        case '/game.js':
            sendFile(res, path.join(__dirname, 'game.js'), 'application/javascript');
            break;
        default:
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            break;
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
