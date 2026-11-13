"use strict";

// Tiny local web server for the Windows app. It only serves the app files from one
// folder, on 127.0.0.1 (this computer only). The app then runs on a normal http address,
// exactly like on a website, so Firebase login and saved data work the same way.
const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function startServer(root, preferredPort) {
  root = path.resolve(root);

  const server = http.createServer(function (req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch (e) {
      res.writeHead(400);
      res.end();
      return;
    }
    if (rel.indexOf("\0") >= 0) { res.writeHead(400); res.end(); return; }
    if (rel === "/") rel = "/index.html";

    const file = path.join(root, rel);
    if (file !== root && file.indexOf(root + path.sep) !== 0) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, function (err, data) {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache"
      });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });

  // Same port every time keeps the saved login. If it is busy, any free port is used.
  return new Promise(function (resolve, reject) {
    function listen(port) {
      server.once("error", function (e) {
        if (e.code === "EADDRINUSE" && port !== 0) listen(0);
        else reject(e);
      });
      server.listen(port, "127.0.0.1", function () { resolve(server.address().port); });
    }
    listen(preferredPort);
  });
}

module.exports = { startServer };
