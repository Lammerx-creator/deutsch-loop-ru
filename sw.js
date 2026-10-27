/* DeutschLoop RU: cache only the public application shell, within this deployment. */
const CACHE_PREFIX = 'deutschloop-ru-';
const CACHE_NAME = CACHE_PREFIX + 'v3';
const SHELL = ['./', './index.html', './styles.css', './content.js', './app.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
const shellURLs = SHELL.map(path => new URL(path, self.registration.scope).href);
const shellPaths = new Set(shellURLs.map(url => new URL(url).pathname));
const indexURL = new URL('./index.html', self.registration.scope).href;
const scopeURL = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(shellURLs)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scopeURL.origin || !shellPaths.has(url.pathname)) return;

  const shellURL = new URL(url.pathname, url.origin).href;
  if (request.mode === 'navigate' && (url.pathname === scopeURL.pathname || shellURL === indexURL)) {
    event.respondWith(fetch(request).then(async response => {
      if (response.status === 200 && response.type !== 'opaque') {
        const copy = response.clone();
        await caches.open(CACHE_NAME).then(cache => cache.put(indexURL, copy)).catch(() => {});
      }
      return response;
    }).catch(async () => (await caches.match(indexURL)) || (await caches.match(scopeURL.href))));
    return;
  }

  event.respondWith(caches.match(shellURL).then(cached => cached || fetch(request).then(async response => {
    if (response.status === 200 && response.type !== 'opaque') {
      const copy = response.clone();
      await caches.open(CACHE_NAME).then(cache => cache.put(shellURL, copy)).catch(() => {});
    }
    return response;
  })));
});

