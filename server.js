const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// In-memory session store { sessionId: userId }
const sessions = {};

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function parseCookies(req) {
    const list = {};
    const header = req.headers.cookie;
    if (!header) return list;
    header.split(';').forEach(cookie => {
        const [key, ...rest] = cookie.split('=');
        list[key.trim()] = rest.join('=').trim();
    });
    return list;
}

function setSessionCookie(res, sessionId) {
    res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `sessionId=; HttpOnly; Path=/; Max-Age=0`);
}

function getUserIdFromSession(req) {
    const cookies = parseCookies(req);
    const sessionId = cookies.sessionId;
    if (!sessionId || !sessions[sessionId]) return null;
    return sessions[sessionId];
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === hashToVerify;
}

function supabaseRequest(method, endpoint, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
        const bodyStr = body ? JSON.stringify(body) : null;
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=representation',
            }
        };
        if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ data: data ? JSON.parse(data) : [], status: res.statusCode }); }
                catch (e) { resolve({ data: [], status: res.statusCode }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function sendFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
            res.end(err.code === 'ENOENT' ? '404 Not Found' : `Server Error: ${err.code}`);
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(e); }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, statusCode, obj) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Registrace
    if (req.url === '/api/register' && req.method === 'POST') {
        try {
            const { username, password } = await readBody(req);
            if (!username || !password || username.length < 3 || password.length < 6) {
                return sendJSON(res, 400, { message: 'Uživatelské jméno min. 3 znaky, heslo min. 6 znaků.' });
            }
            const existing = await supabaseRequest('GET', `users?username=eq.${encodeURIComponent(username)}&select=id`);
            if (existing.data && existing.data.length > 0) {
                return sendJSON(res, 409, { message: 'Uživatelské jméno je již obsazené.' });
            }
            const hashedPassword = hashPassword(password);
            const result = await supabaseRequest('POST', 'users', { username, password: hashedPassword });
            if (result.status !== 200 && result.status !== 201) {
                return sendJSON(res, 500, { message: 'Chyba při registraci.' });
            }
            sendJSON(res, 201, { message: 'Registrace úspěšná. Nyní se přihlaš.' });
        } catch (e) {
            console.error(e);
            sendJSON(res, 400, { message: 'Neplatná data.' });
        }
        return;
    }

    // Přihlášení
    if (req.url === '/api/login' && req.method === 'POST') {
        try {
            const { username, password } = await readBody(req);
            const result = await supabaseRequest('GET', `users?username=eq.${encodeURIComponent(username)}&select=id,password`);
            const user = result.data && result.data[0];
            if (!user || !verifyPassword(password, user.password)) {
                return sendJSON(res, 401, { message: 'Špatné uživatelské jméno nebo heslo.' });
            }
            const sessionId = generateSessionId();
            sessions[sessionId] = user.id;
            setSessionCookie(res, sessionId);
            sendJSON(res, 200, { message: 'Přihlášení úspěšné.', username });
        } catch (e) {
            console.error(e);
            sendJSON(res, 400, { message: 'Neplatná data.' });
        }
        return;
    }

    // Odhlášení
    if (req.url === '/api/logout' && req.method === 'POST') {
        const cookies = parseCookies(req);
        if (cookies.sessionId) delete sessions[cookies.sessionId];
        clearSessionCookie(res);
        sendJSON(res, 200, { message: 'Odhlášení úspěšné.' });
        return;
    }

    // Kdo jsem
    if (req.url === '/api/me' && req.method === 'GET') {
        const userId = getUserIdFromSession(req);
        if (!userId) return sendJSON(res, 401, { message: 'Nepřihlášen.' });
        const result = await supabaseRequest('GET', `users?id=eq.${userId}&select=username`);
        const user = result.data && result.data[0];
        sendJSON(res, 200, { username: user ? user.username : 'Hráč' });
        return;
    }

    // Save hry
    if (req.url === '/api/save' && req.method === 'POST') {
        const userId = getUserIdFromSession(req);
        if (!userId) return sendJSON(res, 401, { message: 'Nepřihlášen.' });
        try {
            const gameData = await readBody(req);
            const now = new Date().toISOString();
            const patch = await supabaseRequest('PATCH', `gamestate?user_id=eq.${userId}`, { data: gameData, updated_at: now });
            if (patch.status === 200 && (!patch.data || patch.data.length === 0)) {
                await supabaseRequest('POST', 'gamestate', { user_id: userId, data: gameData, updated_at: now });
            }
            sendJSON(res, 200, { message: 'Hra uložena.' });
        } catch (e) {
            console.error(e);
            sendJSON(res, 400, { message: 'Chyba při ukládání.' });
        }
        return;
    }

    // Load hry
    if (req.url === '/api/load' && req.method === 'GET') {
        const userId = getUserIdFromSession(req);
        if (!userId) return sendJSON(res, 401, { message: 'Nepřihlášen.' });
        const result = await supabaseRequest('GET', `gamestate?user_id=eq.${userId}&select=data`);
        if (!result.data || result.data.length === 0) return sendJSON(res, 200, {});
        sendJSON(res, 200, result.data[0].data);
        return;
    }

    // Statické soubory
    switch (req.url) {
        case '/': sendFile(res, path.join(__dirname, 'index.html'), 'text/html'); break;
        case '/login':
        case '/login.html': sendFile(res, path.join(__dirname, 'login.html'), 'text/html'); break;
        case '/style.css': sendFile(res, path.join(__dirname, 'style.css'), 'text/css'); break;
        case '/game.js': sendFile(res, path.join(__dirname, 'game.js'), 'application/javascript'); break;
        default:
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
