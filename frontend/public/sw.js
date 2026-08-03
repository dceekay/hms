self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
      icon: "/mds-notification.svg",
      tag: payload.id || payload.eventKey || "mds-hms-update",
      data: {
        url: payload.url || payload.linkUrl || "/",
      },
    })
  );
});
