const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// Helper to send files and set MIME types
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

    // API Routes
    if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                // Basic validation: Ensure it's valid JSON
                JSON.parse(body); 
                fs.writeFile(path.join(__dirname, 'gamestate.json'), body, 'utf8', (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Error saving game state.' }));
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

    if (req.url === '/api/load' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'gamestate.json'), 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // If file doesn't exist, send back a default/empty state
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({})); // Empty object signifies no save data
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Error loading game state.' }));
                }
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
        return;
    }


    // Simple static file routing
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

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Open this URL in your web browser.');
    console.log('Press Ctrl+C to stop the server.');
});
