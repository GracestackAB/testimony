// Service worker push handler — imported into the workbox SW
// Renders incoming Web Push notifications and routes click → action_url.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "testimony.se", body: event.data.text() };
  }
  const title = payload.title || "testimony.se";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png?v=2",
    badge: payload.badge || "/icon-192.png?v=2",
    tag: payload.tag,
    renotify: false,
    data: { url: payload.url || "/", ...(payload.data || {}) },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Try to focus an existing tab on same origin
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            client.focus();
            client.navigate(url);
            return;
          }
        } catch {
          // ignore
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
