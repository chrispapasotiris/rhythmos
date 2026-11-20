/* Ρυθμός — service worker v3 */
var CACHE='rhythmos-v3',FLAG='r-flag',PENDING='r-pending',LASTGOOD='r-last-good',GOOD='r-good',FORCE=null;
var CORE=['./','./index.html','./manifest.webmanifest','./icon.svg'];
var GOOD_INDEX=['good/index.html.txt','good/index.html','good/index.txt'];
var GOOD_MANIFEST=['good/manifest.webmanifest.txt','good/manifest.webmanifest','good/manifest.json.txt','good/manifest.json'];
var BASE=null;

function basePath(){
if(BASE===null){try{BASE=new URL(self.registration.scope).pathname.replace(/\/+$/,'');}catch(e){BASE='';}}
return BASE;
}
function readForce(){
return caches.open(FLAG).then(function(c){return c.match('force').then(function(r){FORCE=r?'1':null;return FORCE;});});
}
function writeForce(on){
FORCE=on?'1':null;
return caches.open(FLAG).then(function(c){return on?c.put('force',new Response('1')):c.delete('force');});
}
function broadcast(msg){
return self.clients.matchAll({includeUncontrolled:true}).then(function(cs){cs.forEach(function(c){try{c.postMessage(msg);}catch(e){}});});
}
function tryFetch(list,i){
if(i>=list.length)return Promise.reject(0);
return fetch(list[i]+'?v='+Date.now(),{cache:'no-store'}).then(function(r){
if(!r.ok)throw 0;
return r.text().then(function(t){if(!t||t.length<200)throw 0;return {text:t,path:list[i]};});
}).catch(function(){return tryFetch(list,i+1);});
}
function looksValid(t){
if(!t||t.length<10000)return false;
if(t.indexOf('name="app-version"')<0)return false;
if(t.indexOf('function render(')<0)return false;
if(t.indexOf('Δεν βρέθηκε αποθηκευμένη έκδοση')>=0)return false;
return true;
}
function emergency(){
return new Response('<!doctype html><html lang="el"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
+'<body style="font-family:system-ui,sans-serif;padding:24px;background:#1e1e2e;color:#fff;line-height:1.5">'
+'<h2 style="margin:0 0 10px">Δεν βρέθηκε αντίγραφο ασφαλείας</h2>'
+'<p style="opacity:.8;font-size:.9rem">Ο worker δεν βρήκε ούτε ζωντανό αρχείο στο <code>good/</code>, ούτε αποθηκευμένο αντίγραφο. Γύρνα στη ζωντανή έκδοση και ανέβασε το backup στον φάκελο <code>good</code>.</p>'
+'<button onclick="caches.delete(\'r-flag\').then(function(){location.reload()})" style="display:block;width:100%;margin:14px 0 8px;padding:14px;border:0;border-radius:14px;background:#6366f1;color:#fff;font:700 1rem system-ui,sans-serif">Επιστροφή στη ζωντανή έκδοση</button>'
+'<button onclick="location.reload()" style="display:block;width:100%;padding:14px;border:0;border-radius:14px;background:#333a55;color:#fff;font:700 1rem system-ui,sans-serif">Απλή ανανέωση</button>'
+'</body></html>',{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
}
function fallbackManifest(){
return new Response(JSON.stringify({name:'Ρυθμός',short_name:'Ρυθμός',id:'./',start_url:'./index.html',scope:'./',display:'standalone',background_color:'#f6f7fb',theme_color:'#6366f1',icons:[{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]}),{headers:{'Content-Type':'application/manifest+json'}});
}
function goodText(key,list,mime){
return tryFetch(list,0).then(function(o){
var nr=new Response(o.text,{headers:{'Content-Type':mime}});
try{caches.open(GOOD).then(function(c){c.put(key,nr.clone());});}catch(e){}
return nr;
}).catch(function(){
return caches.open(GOOD).then(function(c){return c.match(key);}).then(function(r){
if(r)return r;
return caches.open(LASTGOOD).then(function(c){return c.match(key==='manifest'?'manifest.webmanifest':'index.html');});
}).then(function(r){
if(r)return r;
if(key==='manifest')return fallbackManifest();
return caches.open(CACHE).then(function(c){return c.match('./index.html');}).then(function(rr){return rr||emergency();});
});
});
}

self.addEventListener('install',function(e){
e.waitUntil(Promise.all([
caches.open(CACHE).then(function(c){return Promise.all(CORE.map(function(u){return c.add(u).catch(function(){});}));}),
tryFetch(GOOD_INDEX,0).then(function(o){return caches.open(GOOD).then(function(c){return c.put('index',new Response(o.text,{headers:{'Content-Type':'text/html; charset=utf-8'}}));});}).catch(function(){}),
tryFetch(GOOD_MANIFEST,0).then(function(o){return caches.open(GOOD).then(function(c){return c.put('manifest',new Response(o.text,{headers:{'Content-Type':'application/manifest+json'}}));});}).catch(function(){})
]));
self.skipWaiting();
});

self.addEventListener('activate',function(e){
e.waitUntil(caches.keys().then(function(ks){
return Promise.all(ks.filter(function(k){return [CACHE,FLAG,PENDING,LASTGOOD,GOOD].indexOf(k)===-1;}).map(function(k){return caches.delete(k);}));
}).then(function(){return self.clients.claim();}).then(function(){return readForce();}));
});

self.addEventListener('message',function(e){
var d=e.data||{};
if(d.type==='set-force'){
writeForce(d.on).then(function(){
if(e.source)try{e.source.postMessage({type:'force-written',on:!!d.on});}catch(err){}
broadcast({type:'force-state',on:!!d.on});
});
}
else if(d.type==='clear-force'){writeForce(false);}
else if(d.type==='get-force'){readForce().then(function(){if(e.source)try{e.source.postMessage({type:'force-state',on:FORCE==='1'});}catch(err){}});}
else if(d.type==='skip-waiting'){self.skipWaiting();}
else if(d.type==='good-probe'){
tryFetch(GOOD_INDEX,0).then(function(o){
var m=o.text.match(/name="app-version"\s+content="([^"]+)"/);
if(e.source)try{e.source.postMessage({type:'good-probe-result',ok:true,path:o.path,version:m?m[1]:'άγνωστη',bytes:o.text.length,valid:looksValid(o.text)});}catch(err){}
}).catch(function(){
caches.open(GOOD).then(function(c){return c.match('index');}).then(function(r){
if(e.source)try{e.source.postMessage({type:'good-probe-result',ok:false,cached:!!r});}catch(err){}
});
});
}
else if(d.type==='mark-good'){
if(FORCE==='1'||d.ok===false)return;
caches.open(PENDING).then(function(pc){
return Promise.all(['index.html','manifest.webmanifest'].map(function(k){
return pc.match(k).then(function(r){
if(!r)return null;
return r.clone().text().then(function(t){
if(k==='index.html'&&!looksValid(t))return null;
return caches.open(LASTGOOD).then(function(lc){return lc.put(k,r.clone());});
});
});
}));
}).then(function(){if(e.source)try{e.source.postMessage({type:'good-marked'});}catch(err){}});
}
});

self.addEventListener('fetch',function(e){
var url=new URL(e.request.url);
if(url.searchParams.has('vcheck')){e.respondWith(fetch(e.request,{cache:'no-store'}));return;}
if(e.request.method!=='GET')return;

var p=basePath();
var isNav=e.request.mode==='navigate';
var isIndex=isNav&&(url.pathname===p||url.pathname===p+'/'||url.pathname===p+'/index.html');
var isManifest=url.pathname.indexOf('manifest.webmanifest')>-1;

if(isManifest){
e.respondWith(readForce().then(function(f){
if(f==='1')return goodText('manifest',GOOD_MANIFEST,'application/manifest+json');
return fetch(e.request).then(function(res){
if(res.ok){var cp=res.clone();caches.open(PENDING).then(function(c){c.put('manifest.webmanifest',cp);});}
return res;
}).catch(function(){return caches.match(e.request).then(function(r){return r||fallbackManifest();});});
}));
return;
}

if(isIndex){
e.respondWith(readForce().then(function(f){
if(f==='1')return goodText('index',GOOD_INDEX,'text/html; charset=utf-8');
return fetch(e.request).then(function(res){
if(res.ok){var cp=res.clone();caches.open(PENDING).then(function(c){c.put('index.html',cp);});}
return res;
}).catch(function(){
return caches.open(PENDING).then(function(c){return c.match('index.html');}).then(function(r){
if(r)return r;
return caches.open(LASTGOOD).then(function(c){return c.match('index.html');});
}).then(function(r){
if(r)return r;
return caches.open(CACHE).then(function(c){return c.match('./index.html');});
}).then(function(r){
return r||new Response('Εκτός δικτύου και χωρίς αποθηκευμένη έκδοση.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
});
});
}));
return;
}

e.respondWith(fetch(e.request).then(function(res){
if(res.ok||res.type==='opaque'){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(e.request,cp);});}
return res;
}).catch(function(){return caches.match(e.request).then(function(r){return r||Response.error();});}));
});
