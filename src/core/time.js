export const DAY_SHORT=['Δε','Τρ','Τε','Πε','Πα','Σα','Κυ'];
export const DAY_FULL=['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'];
export const MONTH_GEN=['Ιανουαρίου','Φεβρουαρίου','Μαρτίου','Απριλίου','Μαΐου','Ιουνίου','Ιουλίου','Αυγούστου','Σεπτεμβρίου','Οκτωβρίου','Νοεμβρίου','Δεκεμβρίου'];

export function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
export function startOfDay(ts){const d=new Date(ts);d.setHours(0,0,0,0);return d.getTime();}
export function startOfNextDay(ts){const d=new Date(startOfDay(ts));d.setDate(d.getDate()+1);return d.getTime();}
export function mondayIndex(ts){const d=new Date(ts);return (d.getDay()+6)%7;}
export function startOfWeek(ts){const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()-mondayIndex(ts));return d.getTime();}
export function startOfNextWeek(ts){const d=new Date(startOfWeek(ts));d.setDate(d.getDate()+7);return d.getTime();}
export function daysInMonth(ts){const d=new Date(ts);return new Date(d.getFullYear(),d.getMonth()+1,0).getDate();}
export function overlap(aS,aE,bS,bE){return Math.max(0,Math.min(aE,bE)-Math.max(aS,bS));}
export function fmtHM(min){if(!isFinite(min))return '—';const neg=min<-0.5;const m=Math.abs(Math.round(min));const h=Math.floor(m/60),mm=m%60;let out;if(h===0)out=mm+'λ';else if(mm===0)out=h+'ω';else out=h+'ω '+mm+'λ';return (neg?'−':'')+out;}
export function fmtPrecise(min){const abs=Math.abs(min);const h=Math.floor(abs/60),m=Math.floor(abs%60),s=Math.round((abs*60)%60);if(h>0)return s?`${h}ω ${m}λ ${s}δ`:`${h}ω ${m}λ`;if(s>0)return `${m}λ ${s}δ`;return `${Math.round(abs)}λ`;}
export function timeSinceMinutes(min){if(min<1)return 'λιγότερο από 1 λεπτό';if(min<60)return `${Math.floor(min)} λεπτά`;const h=Math.floor(min/60),m=Math.floor(min%60);if(h<24)return m?`${h} ώρες ${m} λεπτά`:`${h} ώρες`;const d=Math.floor(h/24),rh=h%24;return rh?`${d} μέρες ${rh} ώρες`:`${d} μέρες`;}
export function countdownText(min){if(min<=0)return `Εκπρόθεσμη κατά ${timeSinceMinutes(-min)}`;return timeSinceMinutes(min);}
export function formatDate(ts){const d=new Date(ts);return `${DAY_FULL[mondayIndex(ts)]}, ${d.getDate()} ${MONTH_GEN[d.getMonth()]}`;}
export function shortDate(ts){const d=new Date(ts);return `${d.getDate()}/${d.getMonth()+1}`;}
export function weekRangeText(now){const s=startOfWeek(now);const d=new Date(s);d.setDate(d.getDate()+6);return `${shortDate(s)} – ${shortDate(d.getTime())}`;}

export function pad(n){return (n<10?'0':'')+n;}
export function getDailyPlanKey(ts){const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
