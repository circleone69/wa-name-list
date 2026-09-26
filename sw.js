self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open("wa-name-list-v3").then((cache) => cache.addAll(["./", "./index.html", "./app.js", "./manifest.json"]))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== "wa-name-list-v3").map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open("wa-name-list-v3").then((cache) => cache.put(event.request, copy));
      return res;
    }).catch(() => caches.match(event.request))
  );
});
