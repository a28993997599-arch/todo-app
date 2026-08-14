/* 寰呭姙 PWA 绂荤嚎缂撳瓨 - Service Worker */
var CACHE_NAME = 'todo-app-v1';

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// 瀹夎锛氶缂撳瓨鎵€鏈夐潤鎬佽祫婧?self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

// 婵€娲伙細娓呯悊鏃х紦瀛樺苟绔嬪嵆鎺ョ椤甸潰
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_NAME; })
              .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// 璇锋眰锛氱紦瀛樹紭鍏堬紝绂荤嚎涔熻兘鎵撳紑
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request)
        .then(function (response) {
          // 鍙紦瀛樺悓婧愮殑鎴愬姛鍝嶅簲
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(function () {
          // 瀵艰埅璇锋眰绂荤嚎鏃跺洖閫€鍒伴椤?          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
