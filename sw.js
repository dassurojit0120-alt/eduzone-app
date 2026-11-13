"use strict";

// Fast open + works offline:
//  - app files (html / css / js): the saved copy opens at once, a fresh copy is
//    downloaded quietly in the background and is used the next time the app opens.
//  - Firebase library files (fixed version in the URL): cache first.
// Change the number below only if you want to force-clear old caches.
const CACHE = "eduzone-v1";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return Promise.all(SHELL.map(function (u) {
          return c.add(new Request(u, { cache: "reload" })).catch(function () { /* skip */ });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    if (req.mode === "navigate") return caches.match("index.html");
    return null;
  });
}

// Saved copy first (instant, even on a slow network). The network copy updates the cache.
function staleWhileRevalidate(e, req) {
  const refresh = fetch(req)
    .then(function (res) {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    })
    .catch(function () { return null; });

  e.waitUntil(refresh);
  return fromCache(req).then(function (hit) {
    return hit || refresh.then(function (res) { return res || Response.error(); });
  });
}

// Firebase library files never change (fixed version in the URL): cache first.
function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  });
}

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(e, req));
  } else if (url.hostname === "www.gstatic.com") {
    e.respondWith(cacheFirst(req));
  }
  // everything else (Firestore, Auth) is never touched
});
