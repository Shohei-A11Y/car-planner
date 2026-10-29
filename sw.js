/* オフラインでも開けるようにする最小のService Worker。
   アプリ本体はキャッシュ優先、Googleフォントは取れたときだけ使う。
   index.htmlを更新したら VERSION を上げる。 */
var VERSION = "v3";
var CORE = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    // 本体は「キャッシュを返しつつ裏で更新」
    e.respondWith(caches.match(req, {ignoreSearch:true}).then(function(hit){
      var net = fetch(req).then(function(res){
        if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    }));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION).then(function(c){
      return c.match(req).then(function(hit){
        return hit || fetch(req).then(function(res){ c.put(req, res.clone()); return res; }).catch(function(){ return hit; });
      });
    }));
  }
});
