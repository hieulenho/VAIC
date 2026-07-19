/* Aether-DB Service Worker — phục vụ webview KHI MẤT MẠNG.
   Phải được trả về với header:  Content-Type: application/javascript
                                 Service-Worker-Allowed: /webhook/
   Scope = /webhook/ vì script nằm ở /webhook/aether-sw. */
var CACHE = 'aether-db-v3';
var SHELL = './aether-view';

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    // Cache vỏ trang. Payload cảnh báo nằm TRONG url (?data=) nên không cần mạng để render.
    return c.add(new Request(SHELL, { cache: 'reload' })).catch(function(){});
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // 1. Trang cảnh báo: LUÔN trả vỏ đã cache, bỏ qua query string (?data=... luôn khác nhau)
  if (url.pathname.indexOf('/aether-view') >= 0) {
    e.respondWith(
      caches.match(SHELL, { ignoreSearch: true }).then(function(hit){
        if (hit) {
          // Có mạng thì âm thầm làm mới vỏ cho lần sau
          fetch(e.request).then(function(r){
            if (r && r.ok) caches.open(CACHE).then(function(c){ c.put(SHELL, r.clone()); });
          }).catch(function(){});
          return hit;
        }
        return fetch(e.request);
      })
    );
    return;
  }

  // 2. API dự báo: mạng trước, hết mạng thì lấy bản lưu gần nhất (dữ liệu cũ còn hơn màn hình trắng)
  if (url.pathname.indexOf('/aether-forecast') >= 0) {
    e.respondWith(
      fetch(e.request).then(function(r){
        if (r && r.ok) { var cl = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cl); }); }
        return r;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }

  // 3. Tài nguyên khác (mp3 tiếng Mông/Thái, icon): cache trước
  e.respondWith(caches.match(e.request).then(function(hit){
    return hit || fetch(e.request).then(function(r){
      if (r && r.ok && r.type === 'basic') { var cl = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cl); }); }
      return r;
    }).catch(function(){ return hit; });
  }));
});