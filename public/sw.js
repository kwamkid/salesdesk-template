// Service worker: offline fallback, last-loaded pages, Web Push and the number on the app icon.
// Registered by src/components/pwa/app-boot.tsx. Bump VERSION when you change this file.
const VERSION = "v2"; // bump to drop every old cache on the next visit
const SHELL = `shell-${VERSION}`; // offline page and icons
const PAGES = `pages-${VERSION}`; // the last copy of each page the user opened
const ASSETS = `assets-${VERSION}`; // /_next/static files (their names change on every deploy)
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$|\.local$/.test(self.location.hostname);
const SHELL_FILES = ["/offline.html", "/icons/icon-192.png", "/icons/badge-96.png", "/logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase and other sites: never cached
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Pages: network first, then the last copy on this phone, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const landed = new URL(res.url || req.url).pathname;
          if (landed === "/login" || landed.startsWith("/invite")) {
            // Signed out: forget the pages of the previous user.
            caches.delete(PAGES);
          } else if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req, { cacheName: PAGES })) || (await caches.match("/offline.html"))),
    );
    return;
  }

  // Build files and icons never change under the same name: cache first.
  // Never on a local dev server (localhost, 127.0.0.1, LAN IP, *.local): it reuses file names
  // for new code, so a cache-first copy would serve stale CSS/JS forever.
  if (IS_LOCAL) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSETS).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

// Payload sent by src/lib/push.ts: { title, body, url, badge?, tag? }
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }
  const title = data.title || "แจ้งเตือนใหม่";
  const jobs = [
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      data: { url: data.url || "/notifications" },
    }),
  ];
  if (typeof data.badge === "number" && self.navigator && "setAppBadge" in self.navigator) {
    jobs.push(data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge());
  }
  event.waitUntil(Promise.allSettled(jobs));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus().then((c) => (c && "navigate" in c ? c.navigate(target) : undefined));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
