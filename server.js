const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

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
    console.log(`Request for ${req.url}`);

    // Simple routing
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
            // Attempt to serve other files if needed, otherwise 404
            const publicPath = path.join(__dirname, req.url);
            // Basic security check to prevent directory traversal
            if (publicPath.startsWith(__dirname)) {
                 // For simplicity, we only define content types for the main files.
                 // A real server would have a comprehensive MIME type map.
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('403 Forbidden');
            }
            break;
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Open this URL in your web browser.');
    console.log('Press Ctrl+C to stop the server.');
});
