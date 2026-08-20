self.HMS_CACHE_NAME = "mds-hms-app-shell-v2";
self.HMS_APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(self.HMS_CACHE_NAME)
      .then((cache) => cache.addAll(self.HMS_APP_SHELL))
      .finally(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== self.HMS_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(self.HMS_CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached || caches.match(request)))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(self.HMS_CACHE_NAME).then((cache) => cache.put(request, copy));
            }

            return response;
          })
          .catch(() => cached);

        return cached || network;
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);

      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(targetUrl);
        return;
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() || {
    title: "MDS Hospital",
    message: "You have a new hospital update.",
    url: "/",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "MDS Hospital", {
      body: payload.message || payload.body || "You have a new hospital update.",
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      tag: payload.id || payload.eventKey || "mds-hms-update",
      renotify: true,
      requireInteraction: payload.priority === "critical",
      silent: false,
      vibrate: [180, 80, 180],
      data: {
        url: payload.url || payload.linkUrl || "/",
      },
    })
  );
});

