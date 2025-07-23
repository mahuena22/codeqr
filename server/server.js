const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Import our API functions (we'll need to adapt this for CommonJS)
const { TicketAPI } = require('./api-commonjs');

const PORT = process.env.PORT || 5000;

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// Serve static files
function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Handle API requests
async function handleAPI(req, res, pathname) {
  const method = req.method;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      let result;
      
      if (pathname === '/api/generate-ticket' && method === 'POST') {
        const { ticketNumber, type } = JSON.parse(body);
        result = await TicketAPI.generateTicket(ticketNumber, type);
      } else if (pathname === '/api/scan-ticket' && method === 'POST') {
        const { ticketNumber } = JSON.parse(body);
        result = await TicketAPI.scanTicket(ticketNumber);
      } else if (pathname === '/api/dashboard' && method === 'GET') {
        result = await TicketAPI.getDashboardStats();
      } else if (pathname === '/api/next-ticket-number' && method === 'POST') {
        const { type } = JSON.parse(body);
        result = await TicketAPI.getNextTicketNumber(type);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('API Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}

// Main server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Handle API routes
  if (pathname.startsWith('/api/')) {
    await handleAPI(req, res, pathname);
    return;
  }
  
  // Handle static files
  let filePath;
  if (pathname === '/') {
    filePath = path.join(__dirname, '..', 'index.html');
  } else {
    filePath = path.join(__dirname, '..', pathname);
  }
  
  // Security check - don't serve files outside the project directory
  const resolvedPath = path.resolve(filePath);
  const projectPath = path.resolve(__dirname, '..');
  
  if (!resolvedPath.startsWith(projectPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  serveStaticFile(res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

module.exports = server;