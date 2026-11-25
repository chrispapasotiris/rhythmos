import { getDailyPlanKey } from './time.js';

export function timeToMinutes(t){if(!t)return 0;const [h,m]=String(t).split(':').map(Number);return h*60+m;}
export function slotParseHM(v){const p=String(v||'0:0').split(':');return{h:+p[0]||0,m:+p[1]||0};}
export function slotActivityParts(actId){const p=String(actId||'').split(':');return{type:p[0],id:p.slice(1).join(':')};}
export function schedulePlacedDays(slots,courseId){const days=[];(slots||[]).forEach(s=>{if(s.activityId==='course:'+courseId&&days.indexOf(s.day)<0)days.push(s.day);});return days;}
export function scheduleGetDay(slots,day){return(slots||[]).filter(s=>s.day===day).sort((a,b)=>a.start<b.start?-1:(a.start>b.start?1:0));}
export function scheduleFind(slots,id){return(slots||[]).find(s=>s.id===id)||null;}
export function slotStatusGet(slotStatus,slotId,now){const k=getDailyPlanKey(now);return(slotStatus[k]&&slotStatus[k][slotId])||null;}
export function slotEff(s,status){const st=status||{};return{start:st.start||s.start,end:st.end||s.end,count:st.postponeCount||0,status:st.status||'pending',overtime:!!st.overtime,startedAt:st.startedAt||0,lastAsk:st.lastAsk||0};}
