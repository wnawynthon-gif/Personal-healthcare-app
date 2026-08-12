const BUILD='8.6.0-20260812';
const CACHE='personal-health-'+BUILD;
const CORE=['./','./index.html','./styles.css?v=8.6.0-20260812','./app.js?v=8.6.0-20260812','./manifest.json?v=8.6.0-20260812','./build.json'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const a of CORE){try{await c.add(a)}catch{}}await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin)return;
 // HTML/JS/CSS/manifest/build are always network-first and browser-cache bypassed.
 const core=/\.(?:html|js|css|json)$/.test(u.pathname)||u.pathname.endsWith('/');
 if(core){e.respondWith((async()=>{try{const req=new Request(e.request,{cache:'no-store'});const r=await fetch(req);if(r.ok){const c=await caches.open(CACHE);c.put(e.request,r.clone())}return r}catch{ return (await caches.match(e.request))||(await caches.match('./index.html'))}})());return}
 e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
