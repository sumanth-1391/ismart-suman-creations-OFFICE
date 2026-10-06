const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

function sendJSON(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function sendFile(res, file) {
  const safeFile = path.basename(file);
  const filePath = path.join(PUBLIC, safeFile);

  if (!fs.existsSync(filePath)) {
    return sendJSON(res, 404, {
      success: false,
      error: "File not found"
    });
  }

  const ext = path.extname(safeFile).toLowerCase();

  const types = {
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  res.statusCode = 200;
  res.setHeader(
    "Content-Type",
    types[ext] || "application/octet-stream"
  );
  res.end(fs.readFileSync(filePath));
}

async function handler(req, res) {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`
  );

  const pathname = url.pathname;

  if (pathname === "/api/health") {
    return sendJSON(res, 200, {
      success: true,
      app: "ISC OFFICE",
      status: "online",
      time: new Date().toISOString()
    });
  }

  if (pathname === "/api/login") {
    if (req.method !== "POST") {
      return sendJSON(res, 405, {
        success: false,
        error: "Method Not Allowed"
      });
    }

    return sendJSON(res, 200, {
      success: true,
      message: "Login API working"
    });
  }

  if (pathname === "/" || pathname === "/index.html") {
    return sendFile(res, "index.html");
  }

  if (pathname === "/meeting.html") {
    return sendFile(res, "meeting.html");
  }

  if (
    pathname === "/app.js" ||
    pathname === "/style.css"
  ) {
    return sendFile(res, pathname.slice(1));
  }

  return sendJSON(res, 404, {
    success: false,
    error: "Not found",
    path: pathname
  });
}

module.exports = handler;

if (require.main === module) {
  const http = require("http");
  const PORT = process.env.PORT || 3000;

  http.createServer(handler).listen(PORT, () => {
    console.log(`ISC OFFICE running on http://localhost:${PORT}`);
  });
}