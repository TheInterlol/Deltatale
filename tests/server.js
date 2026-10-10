// Minimální statický server bez závislostí. Používají ho testy a `npm start`.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg'
};

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let filePath = path.join(ROOT, decodeURIComponent(url.pathname));

    // nepustit požadavky mimo složku projektu
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (url.pathname.endsWith('/')) filePath = path.join(filePath, 'index.html');

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream',
        'Content-Length': stat.size
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`Deltatale běží na http://localhost:${port}`);
  });
}
