const CACHE_NAME = "my-garage-door-v3";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./images/background.png",
  "./images/garage-door.png",
  "./images/garage-interior.png",
  "./images/car.png",
  "./images/car-red-pickup.png",
  "./images/car-yellow-van.png",
  "./images/car-green-jeep.png",
  "./images/car-purple-racer.png",
  "./images/car-none.png",
  "./images/icon-192.png",
  "./images/icon-512.png",
  "./sounds/motor-start.mp3",
  "./sounds/motor-loop.mp3",
  "./sounds/motor-stop.mp3",
  "./sounds/thunk.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    }).catch(() => caches.match("./index.html"))
  );
});
