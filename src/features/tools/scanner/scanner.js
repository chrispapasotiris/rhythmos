import './scanner.css';
(function(){
'use strict';
if(window.__tdScan9)return;window.__tdScan9=1;
var MAXSIDE=2200,PREV=1400,THUMB=460;
var FULLQ=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
var RATIOS=[{id:'full',n:'Πλήρης',r:0},{id:'9:16',n:'9:16',r:9/16},{id:'3:4',n:'3:4',r:3/4},{id:'1:1',n:'1:1',r:1}];
var ratioId='full';
var pgLayout='l2';
try{var _pl=localStorage.getItem((typeof RH_CHANNEL!=='undefined'?RH_CHANNEL:'stable')+'_scan_layout');if(_pl==='ll'||_pl==='l2'||_pl==='l3')pgLayout=_pl;}catch(e){}
var S={pages:[],mode:'cam',idx:-1,stream:null,track:null,torch:false};
var quad=FULLQ.map(function(p){return{x:p.x,y:p.y};}),camErr='',thumbUrls=[],lastPreview=null,clearArm=0,pgDrag=null;
function $(i){return document.getElementById(i);}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function lerp(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function gcd(a,b){while(b){var t=b;b=a%b;a=t;}return a||1;}
function fmtSize(b){if(!b)return '—';if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(0)+' KB';return (b/1048576).toFixed(1)+' MB';}
function isFull(q){return q&&q.length===4&&q[0].x<=0.001&&q[0].y<=0.001&&q[1].x>=0.999&&q[1].y<=0.001&&q[2].x>=0.999&&q[2].y>=0.999&&q[3].x<=0.001&&q[3].y>=0.999;}
function toast(t){var e=$('scToast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){e.classList.remove('show');},2600);}
function busy(t){$('scBusy').classList.add('open');busyText(t);}
function busyText(t){var e=$('scBusyTxt');if(e)e.textContent=t;}
function busyOff(){$('scBusy').classList.remove('open');}
function stamp(){var d=new Date(),p=function(n){return(n<10?'0':'')+n;};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());}
function buf(b){return b.arrayBuffer?b.arrayBuffer():new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result);};r.onerror=rej;r.readAsArrayBuffer(b);});}
var DB=(function(){
var N=SCAN_DB_NAME,ST='pages',db=null;
function open(){return new Promise(function(res,rej){
if(db)return res(db);
if(!('indexedDB' in window))return rej(0);
var r=indexedDB.open(N,1);
r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains(ST))r.result.createObjectStore(ST,{keyPath:'id'});};
r.onsuccess=function(){db=r.result;res(db);};
r.onerror=function(){rej(r.error);};});}
function st(m){return open().then(function(d){return d.transaction(ST,m).objectStore(ST);});}
function req(q){return new Promise(function(res){q.onsuccess=function(){res(q.result);};q.onerror=function(){res(null);};});}
return{
all:function(){return st('readonly').then(function(s){return req(s.getAll());}).then(function(l){return l||[];}).catch(function(){return[];});},
put:function(o){return st('readwrite').then(function(s){return req(s.put(o));}).catch(function(){});},
del:function(i){return st('readwrite').then(function(s){return req(s.delete(i));}).catch(function(){});},
clear:function(){return st('readwrite').then(function(s){return req(s.clear());}).catch(function(){});}
};})();
function loadImg(blob){return new Promise(function(res,rej){
var u=URL.createObjectURL(blob),im=new Image();
im.onload=function(){URL.revokeObjectURL(u);res(im);};
im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('μη αναγνώσιμη εικόνα'));};
im.src=u;});}
function toBlob(cv,q){return new Promise(function(res,rej){cv.toBlob(function(b){b?res(b):rej(new Error('αποτυχία κωδικοποίησης'));},'image/jpeg',q);});}
function oriented(im,rot){var sw=(rot%180)!==0;return{w:sw?im.height:im.width,h:sw?im.width:im.height};}
function pctile(hist,n,p){var a=0,t=n*p;for(var i=0;i<256;i++){a+=hist[i];if(a>=t)return i;}return 255;}
function enhance(d,w,h,mode){
if(mode!=='boost')return;
var n=w*h,i,c;
for(c=0;c<3;c++){
var hh=new Uint32Array(256);
for(i=0;i<n;i++)hh[d[i*4+c]]++;
var a=pctile(hh,n,0.005),b=pctile(hh,n,0.995);
if(b-a<12)continue;
var s=255/(b-a);
for(i=0;i<n;i++)d[i*4+c]=(d[i*4+c]-a)*s;
}
}
function homography(q){
var x0=q[0].x,y0=q[0].y,x1=q[1].x,y1=q[1].y,x2=q[2].x,y2=q[2].y,x3=q[3].x,y3=q[3].y;
var dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
var dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
var den=dx1*dy2-dx2*dy1,g=0,h=0;
if(Math.abs(den)>1e-9){g=(dx3*dy2-dx2*dy3)/den;h=(dx1*dy3-dx3*dy1)/den;}
if(!isFinite(g)||!isFinite(h)){g=0;h=0;}
return{a:x1-x0+g*x1,b:x3-x0+h*x3,c:x0,d:y1-y0+g*y1,e:y3-y0+h*y3,f:y0,g:g,h:h};
}
function warp(cv,q){
var sw=cv.width,sh=cv.height;
var p=q.map(function(pt){return{x:pt.x*sw,y:pt.y*sh};});
var w=Math.max(8,Math.round(Math.max(dist(p[0],p[1]),dist(p[3],p[2]))));
var h=Math.max(8,Math.round(Math.max(dist(p[0],p[3]),dist(p[1],p[2]))));
var H=homography(p);
var src=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,sw,sh).data;
var out=document.createElement('canvas');out.width=w;out.height=h;
var octx=out.getContext('2d');var od=octx.createImageData(w,h);var dd=od.data;
var a=H.a,b=H.b,c=H.c,d=H.d,e=H.e,f=H.f,g=H.g,hh=H.h;
var iw=1/w,ih=1/h,sw1=sw-1,sh1=sh-1,k=0;
for(var j=0;j<h;j++){var v=(j+.5)*ih;
for(var i=0;i<w;i++){var u=(i+.5)*iw;
var dn=g*u+hh*v+1;var sx=(a*u+b*v+c)/dn,sy=(d*u+e*v+f)/dn;
if(sx<0)sx=0;else if(sx>sw1)sx=sw1;
if(sy<0)sy=0;else if(sy>sh1)sy=sh1;
var x0=sx|0,y0=sy|0,x1=x0<sw1?x0+1:x0,y1=y0<sh1?y0+1:y0;
var fx=sx-x0,fy=sy-y0;
var i00=(y0*sw+x0)*4,i10=(y0*sw+x1)*4,i01=(y1*sw+x0)*4,i11=(y1*sw+x1)*4;
var w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
dd[k]=src[i00]*w00+src[i10]*w10+src[i01]*w01+src[i11]*w11;
dd[k+1]=src[i00+1]*w00+src[i10+1]*w10+src[i01+1]*w01+src[i11+1]*w11;
dd[k+2]=src[i00+2]*w00+src[i10+2]*w10+src[i01+2]*w01+src[i11+2]*w11;
dd[k+3]=255;k+=4;
}}
octx.putImageData(od,0,0);return out;
}
function renderPage(pg,maxSide,applyCrop){
return loadImg(pg.blob).then(function(im){
var o=oriented(im,pg.rot),sc=Math.min(1,maxSide/Math.max(o.w,o.h));
var w=Math.max(1,Math.round(o.w*sc)),h=Math.max(1,Math.round(o.h*sc));
var cv=document.createElement('canvas');cv.width=w;cv.height=h;
var cx=cv.getContext('2d',{willReadFrequently:true});
cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
cx.save();cx.translate(w/2,h/2);cx.rotate(pg.rot*Math.PI/180);cx.scale(sc,sc);
cx.drawImage(im,-im.width/2,-im.height/2);cx.restore();
if(applyCrop&&!isFull(pg.quad))cv=warp(cv,pg.quad);
if(pg.filter==='boost'){
var ctx2=cv.getContext('2d',{willReadFrequently:true});
var id=ctx2.getImageData(0,0,cv.width,cv.height);enhance(id.data,cv.width,cv.height,'boost');ctx2.putImageData(id,0,0);
}
return cv;
});}
function jpegInfo(b){
var i=2;
while(i+3<b.length){
if(b[i]!==0xFF){i++;continue;}
var m=b[i+1];
if(m===0xFF){i++;continue;}
if(m===0xD8||m===0xD9||m===0x01||(m>=0xD0&&m<=0xD7)){i+=2;continue;}
var L=(b[i+2]<<8)|b[i+3];
if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC)
return{h:(b[i+5]<<8)|b[i+6],w:(b[i+7]<<8)|b[i+8],comp:b[i+9]};
i+=2+L;
}
return{w:0,h:0,comp:3};}
function makePdf(imgs,sizeMode){
var enc=new TextEncoder(),parts=[],len=0,off=[];
function put(x){var b=(typeof x==='string')?enc.encode(x):x;parts.push(b);len+=b.length;}
function num(v){return(Math.round(v*100)/100).toString();}
var n=imgs.length,i,kids=[];
for(i=0;i<n;i++)kids.push((3+i*3)+' 0 R');
put('%PDF-1.4\n');put(new Uint8Array([37,226,227,207,211,10]));
off[1]=len;put('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
off[2]=len;put('2 0 obj\n<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+n+' >>\nendobj\n');
for(i=0;i<n;i++){
var it=imgs[i],inf=jpegInfo(it.b);
var iw=inf.w||it.w,ih=inf.h||it.h,cs=inf.comp===1?'/DeviceGray':'/DeviceRGB';
var PW,PH,dw,dh,dx,dy;
if(sizeMode==='a4'){
var land=iw>ih;PW=land?841.89:595.28;PH=land?595.28:841.89;
var m=14,f=Math.min((PW-2*m)/iw,(PH-2*m)/ih);
dw=iw*f;dh=ih*f;dx=(PW-dw)/2;dy=(PH-dh)/2;
}else{PW=iw*72/150;PH=ih*72/150;dw=PW;dh=PH;dx=0;dy=0;}
var pn=3+i*3,cn=pn+1,imn=pn+2;
off[pn]=len;put(pn+' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+num(PW)+' '+num(PH)+'] /Resources << /XObject << /Im0 '+imn+' 0 R >> >> /Contents '+cn+' 0 R >>\nendobj\n');
var sb=enc.encode('q\n'+num(dw)+' 0 0 '+num(dh)+' '+num(dx)+' '+num(dy)+' cm\n/Im0 Do\nQ\n');
off[cn]=len;put(cn+' 0 obj\n<< /Length '+sb.length+' >>\nstream\n');put(sb);put('endstream\nendobj\n');
off[imn]=len;put(imn+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+iw+' /Height '+ih+' /ColorSpace '+cs+' /BitsPerComponent 8 /Filter /DCTDecode /Length '+it.b.length+' >>\nstream\n');
put(it.b);put('\nendstream\nendobj\n');
}
var total=3*n+2,xref=len,s='xref\n0 '+(total+1)+'\n0000000000 65535 f \n';
for(i=1;i<=total;i++)s+=('0000000000'+(off[i]||0)).slice(-10)+' 00000 n \n';
s+='trailer\n<< /Size '+(total+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
put(s);
var out=new Uint8Array(len),p=0;
for(i=0;i<parts.length;i++){out.set(parts[i],p);p+=parts[i].length;}
return out;}
function buildBlob(){
var size=$('scSize').value,q=parseFloat($('scQ').value)||0.85,imgs=[],chain=Promise.resolve();
S.pages.forEach(function(pg,i){
chain=chain.then(function(){
busyText('Σελίδα '+(i+1)+' / '+S.pages.length);
return renderPage(pg,MAXSIDE,true).then(function(cv){
return toBlob(cv,q).then(buf).then(function(ab){imgs.push({b:new Uint8Array(ab),w:cv.width,h:cv.height});});
});
});
});
return chain.then(function(){return new Blob([makePdf(imgs,size)],{type:'application/pdf'});});}
function download(blob,name){
var u=URL.createObjectURL(blob),a=document.createElement('a');
a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
setTimeout(function(){URL.revokeObjectURL(u);},5000);}
function doExport(share){
if(!S.pages.length){toast('Δεν υπάρχουν σελίδες.');return;}
busy('Δημιουργία PDF…');
buildBlob().then(function(blob){
var name='scan-'+stamp()+'.pdf';
if(share&&navigator.canShare&&window.File){
var f=new File([blob],name,{type:'application/pdf'});
if(navigator.canShare({files:[f]})){
return navigator.share({files:[f],title:'Σάρωση'}).then(busyOff).catch(busyOff);
}
}
download(blob,name);busyOff();toast('Το PDF αποθηκεύτηκε ('+S.pages.length+' σελ.).');
}).catch(function(e){busyOff();toast('Αποτυχία: '+(e&&e.message||e));});}
function curRatio(){for(var i=0;i<RATIOS.length;i++)if(RATIOS[i].id===ratioId)return RATIOS[i];return RATIOS[0];}
function layoutFrame(){
var f=$('scFrame'),st=$('scStage');
if(!f||!st||S.mode!=='cam')return;
var r=st.getBoundingClientRect(),R=curRatio(),fw,fh;
if(!R.r){fw=r.width;fh=r.height;}
else{var aw=r.width-28,ah=r.height-28;fh=Math.min(ah,aw/R.r);fw=fh*R.r;}
f.style.width=Math.round(fw)+'px';f.style.height=Math.round(fh)+'px';
f.style.left=Math.round((r.width-fw)/2)+'px';f.style.top=Math.round((r.height-fh)/2)+'px';
var lb=f.querySelector('b');if(lb)lb.textContent=R.n;
}
function ratioSync(){
var b=$('scRatioBtn');if(b)b.textContent=curRatio().n;
var pop=$('scRatioPop');
if(pop)Array.prototype.forEach.call(pop.children,function(x){x.classList.toggle('on',x.dataset.r===ratioId);});
layoutFrame();
}
function ratioToggle(){var p=$('scRatioPop');if(p)p.classList.toggle('open');}
function ratioSet(id){
ratioId=id;
var p=$('scRatioPop');if(p)p.classList.remove('open');
ratioSync();
toast('Αναλογία λήψης: '+curRatio().n+'. Το πλαίσιο δείχνει ακριβώς τι θα ληφθεί.');
}
function captureRect(){
var v=$('scVideo'),st=$('scStage').getBoundingClientRect(),fr=$('scFrame').getBoundingClientRect();
var vw=v.videoWidth,vh=v.videoHeight;
var scale=Math.max(st.width/vw,st.height/vh);
var ox=(vw*scale-st.width)/2,oy=(vh*scale-st.height)/2;
var sx=(fr.left-st.left+ox)/scale,sy=(fr.top-st.top+oy)/scale;
var sw=fr.width/scale,sh=fr.height/scale;
sx=clamp(sx,0,vw-1);sy=clamp(sy,0,vh-1);
sw=clamp(sw,1,vw-sx);sh=clamp(sh,1,vh-sy);
return{sx:sx,sy:sy,sw:sw,sh:sh};
}
function camHud(on){
var m=$('scMeta'),f=$('scFrame');
if(m)m.style.display=on?'block':'none';
if(f)f.style.display=on?'block':'none';
if(!on){var p=$('scRatioPop');if(p)p.classList.remove('open');}
if(on)layoutFrame();
}
function camMeta(){
var v=$('scVideo'),m=$('scMeta');
if(!v||!m||!v.videoWidth)return;
var w=v.videoWidth,h=v.videoHeight,g=gcd(w,h);
m.textContent=w+'×'+h+' · '+(w/g)+':'+(h/g);
layoutFrame();
}
function camFail(m){
camErr=m;camHud(false);var e=$('scMsg');
e.innerHTML=m+'<div class="sc-row" style="margin-top:12px"><button class="sc-btn" id="scRetry">Ξανά</button><button class="sc-btn pri" id="scMsgImp">Από αρχεία</button></div>';
e.style.display='block';
$('scRetry').onclick=camStart;
$('scMsgImp').onclick=function(){$('scFile').click();};}
function camStart(){
camErr='';$('scMsg').style.display='none';
if(!window.isSecureContext){camFail('Η κάμερα απαιτεί https ή localhost. Τράβηξε με την κάμερα του κινητού και φόρτωσε τις φωτογραφίες.');return;}
if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){camFail('Δεν υπάρχει πρόσβαση σε κάμερα από αυτό το περιβάλλον.');return;}
navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:2592},height:{ideal:1944}},audio:false})
.catch(function(e){
if(e&&e.name==='OverconstrainedError')return navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
throw e;
})
.then(function(st){S.stream=st;S.track=st.getVideoTracks()[0];$('scVideo').srcObject=st;return $('scVideo').play();})
.then(function(){
camHud(true);camMeta();
var ok=false;try{var c=S.track.getCapabilities?S.track.getCapabilities():null;ok=!!(c&&c.torch);}catch(e){}
$('scTorch').style.display=ok?'grid':'none';
}).catch(function(e){
var map={NotAllowedError:'Δεν δόθηκε άδεια κάμερας.',NotFoundError:'Δεν βρέθηκε κάμερα.',NotReadableError:'Η κάμερα χρησιμοποιείται αλλού.',SecurityError:'Το περιβάλλον δεν επιτρέπει κάμερα.'};
camFail((map[e&&e.name]||('Σφάλμα κάμερας: '+(e&&e.name||'άγνωστο')))+' Εναλλακτικά φόρτωσε φωτογραφίες.');
});}
function camStop(){
if(S.stream){S.stream.getTracks().forEach(function(t){t.stop();});S.stream=null;}
S.track=null;S.torch=false;
var v=$('scVideo');if(v)v.srcObject=null;
var b=$('scTorch');if(b){b.classList.remove('on');b.style.display='none';}
camHud(false);}
function torch(){
if(!S.track)return;
var next=!S.torch;
S.track.applyConstraints({advanced:[{torch:next}]}).then(function(){S.torch=next;$('scTorch').classList.toggle('on',next);})
.catch(function(){toast('Ο φακός δεν υποστηρίζεται εδώ.');});}
function shoot(){
var v=$('scVideo');
if(!v.videoWidth){toast('Η κάμερα δεν είναι έτοιμη.');return;}
layoutFrame();
var r=captureRect();
var sc=Math.min(1,MAXSIDE/Math.max(r.sw,r.sh));
var cv=document.createElement('canvas');
cv.width=Math.max(1,Math.round(r.sw*sc));cv.height=Math.max(1,Math.round(r.sh*sc));
var cx=cv.getContext('2d');cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
cx.drawImage(v,r.sx,r.sy,r.sw,r.sh,0,0,cv.width,cv.height);
toBlob(cv,0.92).then(addPage).then(function(ok){toast(ok?'Προστέθηκε σελίδα '+S.pages.length+'.':'Αποτυχία λήψης.');});}
function makeThumb(pg){return renderPage(pg,THUMB,false).then(function(cv){return toBlob(cv,0.72);}).then(function(b){pg.thumb=b;});}
function addPage(blob){
var pg={id:'p'+Date.now()+'_'+Math.random().toString(36).slice(2,7),blob:blob,rot:0,quad:FULLQ.map(function(p){return{x:p.x,y:p.y};}),filter:'orig',ts:Date.now()};
return makeThumb(pg).then(function(){S.pages.push(pg);return DB.put(pg);}).then(function(){head();return true;}).catch(function(){return false;});}
function importFiles(files){
var arr=[].slice.call(files||[]).filter(function(f){return /^image\//.test(f.type);});
if(!arr.length){toast('Δεν βρέθηκαν εικόνες.');return;}
busy('Φόρτωση…');
var ok=0,chain=Promise.resolve();
arr.forEach(function(f,i){chain=chain.then(function(){busyText((i+1)+' / '+arr.length);return addPage(f).then(function(r){if(r)ok++;});});});
chain.then(function(){busyOff();setMode('pages');toast(ok+' σελίδες προστέθηκαν'+(ok<arr.length?', '+(arr.length-ok)+' δεν διαβάστηκαν':'')+'.');});}
function head(){
var n=S.pages.length,sub=$('scSub');
if(S.mode==='edit'){sub.textContent=(S.idx+1)+' / '+n;sub.classList.add('link');}
else{sub.textContent=n?n+(n===1?' σελίδα':' σελίδες'):'Κάμερα';sub.classList.remove('link');}
var c=$('scEditCount');if(c)c.textContent=(S.idx+1)+'/'+n;
}
function revokeThumbs(){thumbUrls.forEach(function(u){try{URL.revokeObjectURL(u);}catch(e){}});thumbUrls=[];}
function setPgLayout(k){
pgLayout=k;
try{localStorage.setItem((typeof RH_CHANNEL!=='undefined'?RH_CHANNEL:'stable')+'_scan_layout',k);}catch(e){}
var g=$('scPagesGrid');if(g)g.className=k;
Array.prototype.forEach.call(document.querySelectorAll('.sc-lay'),function(b){b.classList.toggle('on',b.dataset.l===k);});
renderPages();
}
function renderPages(){
revokeThumbs();
var g=$('scPagesGrid');if(!g)return;
g.className=pgLayout;
if(!S.pages.length){g.innerHTML='<div class="sc-empty">Καμία σελίδα ακόμα. Τράβηξε με την κάμερα ή φόρτωσε φωτογραφίες.</div>';return;}
g.innerHTML=S.pages.map(function(p,i){
var u=p.thumb?URL.createObjectURL(p.thumb):'';if(u)thumbUrls.push(u);
return '<div class="sc-pg" data-i="'+i+'"><span class="sc-num">'+(i+1)+'</span>'+(isFull(p.quad)?'':'<span class="sc-cut">κοπή</span>')
+'<img src="'+u+'" alt="Σελίδα '+(i+1)+'" draggable="false">'
+'<div class="sc-pginfo"><b>Σελίδα '+(i+1)+'</b><span>'+fmtSize(p.blob?p.blob.size:0)+'</span></div>'
+'<div class="sc-pgbar">'
+'<button class="sc-mini" data-a="edit" data-i="'+i+'" aria-label="Επεξεργασία">✎</button>'
+'<button class="sc-mini" data-a="l" data-i="'+i+'"'+(i===0?' disabled':'')+' aria-label="Πριν">←</button>'
+'<button class="sc-mini" data-a="r" data-i="'+i+'"'+(i===S.pages.length-1?' disabled':'')+' aria-label="Μετά">→</button>'
+'<button class="sc-mini d" data-a="del" data-i="'+i+'" aria-label="Διαγραφή">✕</button>'
+'</div></div>';}).join('');}
function pgCards(){var g=$('scPagesGrid');return g?Array.prototype.slice.call(g.querySelectorAll('.sc-pg')):[];}
function pgDetach(d){
clearTimeout(d.timer);
if(d.raf)cancelAnimationFrame(d.raf);
window.removeEventListener('pointermove',d.mv);
window.removeEventListener('pointerup',d.up);
window.removeEventListener('pointercancel',d.cx);
document.removeEventListener('touchmove',d.tm);
}
function pgHideInd(d){if(d.indH)d.indH.style.display='none';if(d.indV)d.indV.style.display='none';}
function pgCancel(d){
pgDetach(d);
if(d.clone&&d.clone.parentNode)d.clone.parentNode.removeChild(d.clone);
if(d.indH&&d.indH.parentNode)d.indH.parentNode.removeChild(d.indH);
if(d.indV&&d.indV.parentNode)d.indV.parentNode.removeChild(d.indV);
if(d.el)d.el.classList.remove('sc-dragging');
if(pgDrag===d)pgDrag=null;
}
function pgDown(e){
if(pgDrag||S.pages.length<2)return;
if(e.target.closest('button'))return;
var card=e.target.closest('.sc-pg');if(!card)return;
var d={el:card,x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,
started:false,from:pgCards().indexOf(card),k:null,clone:null,indH:null,indV:null,
offX:0,offY:0,w:0,h:0,raf:0,timer:0};
d.mv=function(ev){
d.lx=ev.clientX;d.ly=ev.clientY;
if(!d.started){if(Math.abs(ev.clientX-d.x0)+Math.abs(ev.clientY-d.y0)>12)pgCancel(d);}
else pgMove(d);
};
d.up=function(){pgUp(d);};
d.cx=function(){if(d.started)pgUp(d);else pgCancel(d);};
d.tm=function(ev){if(d.started&&ev.cancelable)ev.preventDefault();};
d.timer=setTimeout(function(){pgStart(d);},280);
window.addEventListener('pointermove',d.mv);
window.addEventListener('pointerup',d.up);
window.addEventListener('pointercancel',d.cx);
document.addEventListener('touchmove',d.tm,{passive:false});
pgDrag=d;
}
function pgStart(d){
if(pgDrag!==d||!d.el.parentNode)return;
d.started=true;
var r=d.el.getBoundingClientRect();
d.offX=d.lx-r.left;d.offY=d.ly-r.top;d.w=r.width;d.h=r.height;
var c=d.el.cloneNode(true);
c.className='sc-pg sc-ghost';
c.style.width=r.width+'px';c.style.height=r.height+'px';
c.style.left=r.left+'px';c.style.top=r.top+'px';
$('scRoot').appendChild(c);d.clone=c;
d.el.classList.add('sc-dragging');
var g=$('scPagesGrid');
d.indH=document.createElement('div');d.indH.className='sc-drop';g.appendChild(d.indH);
d.indV=document.createElement('div');d.indV.className='sc-drop';g.appendChild(d.indV);
try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}
pgMove(d);
var loop=function(){if(pgDrag!==d||!d.started)return;pgEdge(d);d.raf=requestAnimationFrame(loop);};
d.raf=requestAnimationFrame(loop);
}
function pgMove(d){
if(!d.started||!d.clone)return;
d.clone.style.left=Math.max(4,Math.min(window.innerWidth-d.w-4,d.lx-d.offX))+'px';
d.clone.style.top=Math.max(4,Math.min(window.innerHeight-d.h-4,d.ly-d.offY))+'px';
pgIndicator(d);
}
function pgIndicator(d){
var grid=$('scPagesGrid'),cards=pgCards();
if(!grid||cards.length<2){d.k=null;pgHideInd(d);return;}
var gr=grid.getBoundingClientRect(),x=d.lx,y=d.ly;
var sr=d.el.getBoundingClientRect(),cx=sr.left+sr.width/2,cy=sr.top+sr.height/2;
var dx=x-cx,dy=y-cy;
var hov=-1,best=1e9,i,r;
for(i=0;i<cards.length;i++){
r=cards[i].getBoundingClientRect();
if(x>=r.left-6&&x<=r.right+6&&y>=r.top-6&&y<=r.bottom+6){hov=i;break;}
var dd=Math.hypot(x-(r.left+r.width/2),y-(r.top+r.height/2));
if(dd<best){best=dd;hov=i;}
}
if(hov<0||hov===d.from){d.k=null;pgHideInd(d);return;}
d.k=hov;
r=cards[hov].getBoundingClientRect();
var isList=pgLayout==='ll';
var sigX=Math.abs(dx)>18,sigY=Math.abs(dy)>18;
var showH=isList?true:sigY;
var showV=(!isList)&&sigX;
if(!showH&&!showV)showH=true;
if(showH){
d.indH.style.display='block';
d.indH.style.left=(r.left-gr.left)+'px';
d.indH.style.width=r.width+'px';
d.indH.style.height='4px';
d.indH.style.top=((dy<0?r.top-6:r.bottom+2)-gr.top)+'px';
}else d.indH.style.display='none';
if(showV){
d.indV.style.display='block';
d.indV.style.top=(r.top-gr.top)+'px';
d.indV.style.height=r.height+'px';
d.indV.style.width='4px';
d.indV.style.left=((dx<0?r.left-6:r.right+2)-gr.left)+'px';
}else d.indV.style.display='none';
}
function pgEdge(d){
var sc=$('scPages');if(!sc)return;
var r=sc.getBoundingClientRect(),zone=64,v=0;
if(d.ly<r.top+zone)v=-Math.min(14,Math.ceil((r.top+zone-d.ly)/zone*14));
else if(d.ly>r.bottom-zone)v=Math.min(14,Math.ceil((d.ly-(r.bottom-zone))/zone*14));
if(v){sc.scrollTop+=v;pgIndicator(d);}
}
function pgUp(d){
pgDetach(d);
if(!d.started){if(pgDrag===d)pgDrag=null;return;}
var from=d.from,to=d.k;
if(to!=null&&from>=0&&to!==from&&to<S.pages.length){
var moved=S.pages.splice(from,1)[0];
S.pages.splice(to,0,moved);
S.pages.forEach(function(p,i){p.ts=i;DB.put(p);});
toast('Η σειρά αποθηκεύτηκε.');
}
if(d.clone&&d.clone.parentNode)d.clone.parentNode.removeChild(d.clone);
if(d.indH&&d.indH.parentNode)d.indH.parentNode.removeChild(d.indH);
if(d.indV&&d.indV.parentNode)d.indV.parentNode.removeChild(d.indV);
if(d.el)d.el.classList.remove('sc-dragging');
pgDrag=null;
renderPages();head();
}
function setMode(m){
if(pgDrag)pgCancel(pgDrag);
S.mode=m;
$('scVideo').style.display=m==='cam'?'block':'none';
$('scWrap').style.display=m==='edit'?'block':'none';
$('scPages').style.display=m==='pages'?'block':'none';
$('scBarCam').style.display=m==='cam'?'flex':'none';
$('scBarEdit').style.display=m==='edit'?'flex':'none';
$('scBarPages').style.display=m==='pages'?'flex':'none';
$('scMsg').style.display=(m==='cam'&&camErr)?'block':'none';
if(m==='cam'){if(!S.stream)camStart();else camHud(true);}else camStop();
if(m==='pages'){renderPages();$('scPages').scrollTop=0;}
head();}
function fitPreview(cv){
var r=$('scStage').getBoundingClientRect(),pad=16;
var sc=Math.min((r.width-pad*2)/cv.width,(r.height-pad*2)/cv.height);
var w=Math.max(1,Math.round(cv.width*sc)),h=Math.max(1,Math.round(cv.height*sc));
var wr=$('scWrap');wr.style.width=w+'px';wr.style.height=h+'px';
var C=$('scCv');C.width=cv.width;C.height=cv.height;
C.getContext('2d').drawImage(cv,0,0);}
function layoutQuad(){
var pts=quad.map(function(p){return(p.x*100).toFixed(2)+' '+(p.y*100).toFixed(2);});
$('scQPoly').setAttribute('points',pts.join(' '));
$('scQMask').setAttribute('d','M0 0H100V100H0Z M'+pts.join(' L')+' Z');
var g=$('scQGrid');
for(var t=0;t<2;t++){
var f=(t+1)/3;
var a=lerp(quad[0],quad[3],f),b=lerp(quad[1],quad[2],f);
var c=lerp(quad[0],quad[1],f),d=lerp(quad[3],quad[2],f);
g.children[t].setAttribute('x1',a.x*100);g.children[t].setAttribute('y1',a.y*100);
g.children[t].setAttribute('x2',b.x*100);g.children[t].setAttribute('y2',b.y*100);
g.children[2+t].setAttribute('x1',c.x*100);g.children[2+t].setAttribute('y1',c.y*100);
g.children[2+t].setAttribute('x2',d.x*100);g.children[2+t].setAttribute('y2',d.y*100);
}
['tl','tr','br','bl'].forEach(function(k,i){
var h=$('scQh'+k);h.style.left=(quad[i].x*100)+'%';h.style.top=(quad[i].y*100)+'%';});
}
function commitEdit(){
var pg=S.pages[S.idx];if(!pg)return;
pg.quad=quad.map(function(p){return{x:p.x,y:p.y};});
DB.put(pg);
}
function openEdit(i){
var pg=S.pages[i];if(!pg)return;
S.idx=i;setMode('edit');
quad=pg.quad.map(function(p){return{x:p.x,y:p.y};});
chips();layoutQuad();
renderPage(pg,PREV,false).then(function(cv){
lastPreview=cv;
requestAnimationFrame(function(){fitPreview(cv);layoutQuad();});
}).catch(function(){toast('Η εικόνα δεν διαβάζεται.');setMode('pages');});}
function navEdit(d){
var n=S.pages.length;if(n<2)return;
commitEdit();
openEdit((S.idx+d+n)%n);
}
function chips(){
var pg=S.pages[S.idx];if(!pg)return;
Array.prototype.forEach.call($('scChips').querySelectorAll('[data-f]'),function(b){b.classList.toggle('on',b.dataset.f===pg.filter);});}
function setFilter(f){
var pg=S.pages[S.idx];if(!pg)return;
pg.filter=f;chips();DB.put(pg);
renderPage(pg,PREV,false).then(function(cv){lastPreview=cv;fitPreview(cv);});}
function rotate(){
var pg=S.pages[S.idx];if(!pg)return;
pg.rot=(pg.rot+90)%360;
var r=function(p){return{x:1-p.y,y:p.x};};
quad=[r(quad[3]),r(quad[0]),r(quad[1]),r(quad[2])];
layoutQuad();
renderPage(pg,PREV,false).then(function(cv){lastPreview=cv;fitPreview(cv);layoutQuad();});}
function pt(e){var r=$('scWrap').getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};}
function dragCorner(k,e){
e.preventDefault();e.stopPropagation();
function mv(ev){quad[k]=pt(ev);layoutQuad();}
function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);}
document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);}
function dragAll(e){
e.preventDefault();
var s=pt(e),q0=quad.map(function(p){return{x:p.x,y:p.y};});
var minX=Math.min.apply(null,q0.map(function(p){return p.x;})),maxX=Math.max.apply(null,q0.map(function(p){return p.x;}));
var minY=Math.min.apply(null,q0.map(function(p){return p.y;})),maxY=Math.max.apply(null,q0.map(function(p){return p.y;}));
function mv(ev){
var p=pt(ev);
var dx=clamp(p.x-s.x,-minX,1-maxX),dy=clamp(p.y-s.y,-minY,1-maxY);
quad=q0.map(function(q){return{x:q.x+dx,y:q.y+dy};});
layoutQuad();}
function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);}
document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);}
var I={
back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>',
x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
shut:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
torch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v5l-2 3v12h-2V10L9 7z"/></svg>',
rot:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>',
prev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg>',
next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>',
scan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><path d="M7 12h10"/></svg>',
layList:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
lay2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
lay3:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1"/><rect x="17" y="3" width="4" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1"/><rect x="10" y="10" width="5" height="5" rx="1"/><rect x="17" y="10" width="4" height="5" rx="1"/><rect x="3" y="17" width="5" height="4" rx="1"/><rect x="10" y="17" width="5" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/></svg>'
};
var built=false;
function build(){
if(built)return;built=true;
var r=document.createElement('div');r.id='scRoot';
r.innerHTML=
'<div class="sc-top"><button class="sc-ico" id="scBack" aria-label="Πίσω">'+I.back+'</button>'
+'<h3>Σαρωτής PDF</h3><button class="sc-sub" id="scSub" aria-label="Λίστα σελίδων"></button>'
+'<button class="sc-ico" id="scClose" aria-label="Κλείσιμο">'+I.x+'</button></div>'
+'<div id="scStage"><video id="scVideo" playsinline muted autoplay></video>'
+'<div id="scFrame"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><b>Πλήρης</b></div>'
+'<div id="scWrap"><canvas id="scCv"></canvas>'
+'<svg id="scQSvg" viewBox="0 0 100 100" preserveAspectRatio="none">'
+'<path id="scQMask" fill="rgba(0,0,0,.5)" fill-rule="evenodd" d=""/>'
+'<g id="scQGrid" stroke="rgba(255,255,255,.28)" stroke-width="1">'
+'<line vector-effect="non-scaling-stroke"/><line vector-effect="non-scaling-stroke"/><line vector-effect="non-scaling-stroke"/><line vector-effect="non-scaling-stroke"/></g>'
+'<polygon id="scQPoly" fill="rgba(0,0,0,0)" stroke="#fff" stroke-width="1.6" vector-effect="non-scaling-stroke" points=""/>'
+'</svg>'
+'<div class="sc-qh" id="scQhtl"></div><div class="sc-qh" id="scQhtr"></div><div class="sc-qh" id="scQhbr"></div><div class="sc-qh" id="scQhbl"></div>'
+'</div>'
+'<div id="scPages"><div id="scPagesBar"><span class="sp"></span>'
+'<button type="button" class="sc-lay" data-l="ll" aria-label="Λίστα">'+I.layList+'</button>'
+'<button type="button" class="sc-lay" data-l="l2" aria-label="Πλέγμα 2 στηλών">'+I.lay2+'</button>'
+'<button type="button" class="sc-lay" data-l="l3" aria-label="Πλέγμα 3 στηλών">'+I.lay3+'</button>'
+'</div>'
+'<div class="sc-hint">Κράτα πατημένη μια σελίδα και σύρε. Ευθεία μεταφορά: ένας δείκτης· λόξια: δύο, στις ακμές του στόχου.</div>'
+'<div id="scPagesGrid"></div></div><div id="scMsg"></div>'
+'<div id="scMeta">—</div>'
+'<div id="scRatioPop">'+RATIOS.map(function(x){return '<button type="button" data-r="'+x.id+'">'+x.n+'</button>';}).join('')+'</div></div>'
+'<div class="sc-bar" id="scBarCam">'
+'<button class="sc-ico" id="scImp" aria-label="Από αρχεία">'+I.folder+'</button>'
+'<button class="sc-ico" id="scRatioBtn" aria-label="Αναλογία λήψης">Πλήρης</button>'
+'<button class="sc-fire" id="scShut" aria-label="Λήψη">'+I.shut+'</button>'
+'<button class="sc-ico" id="scTorch" style="display:none" aria-label="Φακός">'+I.torch+'</button>'
+'<button class="sc-btn" id="scToList">Σελίδες</button></div>'
+'<div class="sc-bar col" id="scBarEdit">'
+'<div class="sc-chips" id="scChips">'
+'<button data-f="orig">Αρχικό</button><button data-f="boost">Ενίσχυση</button>'
+'<span class="sc-flex"></span>'
+'<button class="sc-nav" id="scPrev" aria-label="Προηγούμενη σελίδα">'+I.prev+'</button>'
+'<span class="sc-count" id="scEditCount">1/1</span>'
+'<button class="sc-nav" id="scNext" aria-label="Επόμενη σελίδα">'+I.next+'</button></div>'
+'<div class="sc-row"><button class="sc-ico" id="scRot" aria-label="Περιστροφή">'+I.rot+'</button>'
+'<button class="sc-btn" id="scFull">Πλήρες κάδρο</button>'
+'<button class="sc-btn pri" id="scDone">Τέλος</button></div></div>'
+'<div class="sc-bar col" id="scBarPages">'
+'<div class="sc-opts"><label>Μέγεθος<select id="scSize"><option value="a4">A4</option><option value="auto">Ίδιο με την εικόνα</option></select></label>'
+'<label>Ποιότητα<select id="scQ"><option value="0.7">Ελαφριά</option><option value="0.85" selected>Κανονική</option><option value="0.95">Υψηλή</option></select></label></div>'
+'<div class="sc-row"><button class="sc-btn" id="scMore">+ Σελίδα</button>'
+'<button class="sc-btn" id="scClear">Καθαρισμός</button>'
+(navigator.canShare?'<button class="sc-btn" id="scShare">Αποστολή</button>':'')
+'<button class="sc-btn pri" id="scExp">PDF</button></div></div>'
+'<div id="scToast"></div><div id="scBusy"><div><span id="scBusyTxt">…</span><small>Μην κλείσεις την οθόνη</small></div></div>'
+'<div id="scConfirm"><div class="sc-cbox"><p>Κλείσιμο σαρωτή; Οι σελίδες μένουν αποθηκευμένες στη συσκευή και θα τις βρεις όπως τις άφησες.</p>'
+'<div class="sc-row"><button class="sc-btn" id="scCNo">Συνέχεια</button><button class="sc-btn warn" id="scCYes">Κλείσιμο</button></div></div></div>'
+'<input type="file" id="scFile" accept="image/*" multiple style="display:none">';
document.body.appendChild(r);
$('scClose').onclick=attemptClose;
$('scCNo').onclick=function(){$('scConfirm').classList.remove('open');};
$('scCYes').onclick=function(){$('scConfirm').classList.remove('open');doClose();};
$('scBack').onclick=function(){
if(S.mode==='edit'){commitEdit();setMode('cam');}
else if(S.mode==='pages')setMode('cam');
else{if(S.pages.length)setMode('pages');else attemptClose();}
};
$('scSub').onclick=function(){if(S.mode==='edit'){commitEdit();setMode('pages');}};
$('scImp').onclick=function(){$('scFile').click();};
$('scFile').onchange=function(){importFiles(this.files);this.value='';};
$('scRatioBtn').onclick=ratioToggle;
$('scRatioPop').addEventListener('click',function(e){var b=e.target.closest('button');if(b)ratioSet(b.dataset.r);});
$('scShut').onclick=shoot;
$('scTorch').onclick=torch;
$('scVideo').addEventListener('loadedmetadata',camMeta);
$('scToList').onclick=function(){setMode('pages');};
$('scRot').onclick=rotate;
$('scFull').onclick=function(){quad=FULLQ.map(function(p){return{x:p.x,y:p.y};});layoutQuad();};
$('scDone').onclick=function(){commitEdit();setMode('pages');};
$('scPrev').onclick=function(){navEdit(-1);};
$('scNext').onclick=function(){navEdit(1);};
$('scMore').onclick=function(){setMode('cam');};
$('scExp').onclick=function(){doExport(false);};
if($('scShare'))$('scShare').onclick=function(){doExport(true);};
$('scClear').onclick=function(){
var b=$('scClear');
if(!clearArm){clearArm=1;b.textContent='Σίγουρα;';b.classList.add('warn');
setTimeout(function(){clearArm=0;b.textContent='Καθαρισμός';b.classList.remove('warn');},3000);return;}
clearArm=0;b.textContent='Καθαρισμός';b.classList.remove('warn');
DB.clear().then(function(){S.pages=[];renderPages();head();toast('Άδειασε.');});};
$('scChips').addEventListener('click',function(e){var b=e.target.closest('[data-f]');if(b)setFilter(b.dataset.f);});
Array.prototype.forEach.call(document.querySelectorAll('.sc-lay'),function(b){
b.onclick=function(){setPgLayout(b.dataset.l);};
});
$('scPages').addEventListener('pointerdown',pgDown);
$('scPages').addEventListener('contextmenu',function(e){if(pgDrag&&pgDrag.started)e.preventDefault();});
$('scPages').addEventListener('click',function(e){
var b=e.target.closest('.sc-mini');if(!b||b.disabled)return;
var i=parseInt(b.dataset.i,10),a=b.dataset.a;
if(a==='edit')return openEdit(i);
if(a==='del'){var pg=S.pages.splice(i,1)[0];DB.del(pg.id);S.pages.forEach(function(p,k){p.ts=k;DB.put(p);});renderPages();head();return;}
var j=a==='l'?i-1:i+1;
if(j<0||j>=S.pages.length)return;
var t=S.pages[i];S.pages[i]=S.pages[j];S.pages[j]=t;
S.pages.forEach(function(p,k){p.ts=k;DB.put(p);});
renderPages();});
$('scQPoly').addEventListener('pointerdown',dragAll);
['tl','tr','br','bl'].forEach(function(k,i){
$('scQh'+k).addEventListener('pointerdown',function(e){dragCorner(i,e);});});
r.addEventListener('pointerdown',function(e){
var b=e.target.closest('button');if(!b)return;
b.classList.remove('sc-press');void b.offsetWidth;b.classList.add('sc-press');
});
r.addEventListener('animationend',function(e){
if(e.target.classList&&e.target.classList.contains('sc-press'))e.target.classList.remove('sc-press');});
ratioSync();
setPgLayout(pgLayout);
}
function attemptClose(){
if(pgDrag)pgCancel(pgDrag);
if(S.mode==='edit')commitEdit();
if(S.pages.length)$('scConfirm').classList.add('open');
else doClose();
}
function doClose(){
if(pgDrag)pgCancel(pgDrag);
camStop();revokeThumbs();
$('scRoot').classList.remove('open');
document.body.style.overflow='';
if(S.pages.length)toast('Οι σελίδες μένουν αποθηκευμένες.');}
function scanOpen(){
build();
tdClose();
document.body.style.overflow='hidden';
$('scRoot').classList.add('open');
DB.all().then(function(l){
S.pages=(l||[]).sort(function(a,b){return a.ts-b.ts;});
var chain=Promise.resolve();
S.pages.forEach(function(p){
if(!Array.isArray(p.quad)||p.quad.length!==4)p.quad=FULLQ.map(function(q){return{x:q.x,y:q.y};});
if(p.crop)delete p.crop;
if(p.filter!=='orig'&&p.filter!=='boost')p.filter='orig';
if(!p.rot)p.rot=0;
chain=chain.then(function(){return makeThumb(p).catch(function(){});});
});
chain.then(function(){setMode(S.pages.length?'pages':'cam');});});}
var tdWrap=null;
function tdHide(){
if(!tdWrap)return;
var p=$('tdPanel');
if(p)tdWrap.style.setProperty('--tdHide',(-p.offsetWidth)+'px');}
function tdClose(){if(tdWrap)tdWrap.classList.remove('open');var h=$('tdHandle');if(h)h.setAttribute('aria-expanded','false');}
function tdToggle(){
if(!tdWrap)return;
var on=tdWrap.classList.toggle('open');
$('tdHandle').setAttribute('aria-expanded',on?'true':'false');}
function buildDrawer(){
if(tdWrap)return;
tdWrap=document.createElement('div');tdWrap.id='tdWrap';
var slots='';
for(var i=0;i<10;i++){
if(i===0)slots+='<button type="button" class="td-slot" id="tdScan" aria-label="Σάρωση PDF">'+I.scan+'<span class="td-lbl">Σάρωση</span></button>';
else slots+='<div class="td-slot td-soon" aria-disabled="true">coming soon</div>';
}
tdWrap.innerHTML='<div id="tdPanel"><div class="td-cap">Εργαλεία</div><div id="tdGrid">'+slots+'</div></div>'
+'<button type="button" id="tdHandle" aria-label="Εργαλεία" aria-expanded="false">'
+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></button>';
document.body.appendChild(tdWrap);
$('tdHandle').onclick=tdToggle;
$('tdScan').onclick=scanOpen;
tdHide();
document.addEventListener('click',function(e){
if(tdWrap.classList.contains('open')&&!tdWrap.contains(e.target))tdClose();});
}
window.addEventListener('resize',function(){
tdHide();
if(pgDrag)pgCancel(pgDrag);
if(!built||!$('scRoot').classList.contains('open'))return;
if(S.mode==='cam')layoutFrame();
if(S.mode==='edit'&&lastPreview){fitPreview(lastPreview);layoutQuad();}});
document.addEventListener('keydown',function(e){
if(e.key!=='Escape')return;
if(pgDrag){pgCancel(pgDrag);renderPages();return;}
if(built&&$('scRoot').classList.contains('open')){
if($('scConfirm').classList.contains('open')){$('scConfirm').classList.remove('open');return;}
attemptClose();return;}
tdClose();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildDrawer);
else buildDrawer();
})();
/* ===== ΤΕΛΟΣ ΕΡΓΑΛΕΙΩΝ v9 ===== */
