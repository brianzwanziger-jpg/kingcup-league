/* KingCup operations upgrades: dashboard, history, backups; no changes to underlying picks. */
(()=>{
if(new URLSearchParams(location.search).has('gd_token')||new URLSearchParams(location.search).has('cc_token'))return;
const escHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const endpoint='https://jtptfoujwxqgqhcezndb.supabase.co/functions/v1/kingcup-push';
const isAdmin=()=>typeof editing!=='undefined'&&editing&&typeof session!=='undefined'&&!!session;
async function post(action,args={}){
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(session?{'Authorization':'Bearer '+session.access_token}:{})},body:JSON.stringify({action,...args})});
 const v=await r.json().catch(()=>({}));if(!r.ok)throw Error(v.error||'Request failed');return v;
}
async function rpcOps(name,params={}){
 const r=await api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(params)},isAdmin());
 const v=await r.json().catch(()=>null);if(!r.ok)throw Error(v?.message||v?.error||'Unable to load');return v;
}
function dashboard(e){
 const host=document.getElementById('privateGameDay');if(!host||host.querySelector('#kcOpsDashboard'))return;
 const section=document.createElement('details');section.id='kcOpsDashboard';section.className='card';section.open=true;
 section.innerHTML='<summary style="font-size:18px;font-weight:750;cursor:pointer">📋 GameDay Commissioner Dashboard</summary><div id="kcOpsStatus" class="note">Loading submissions and notification status…</div><div id="kcOpsRows"></div><button type="button" class="secondary full" id="kcOpsRefresh">Refresh Dashboard</button><details style="margin-top:12px"><summary>🔔 Push delivery history</summary><div id="kcOpsDelivery" class="note">Loading…</div></details>';
 host.prepend(section);
 const load=async()=>{
  const status=section.querySelector('#kcOpsStatus'),rows=section.querySelector('#kcOpsRows'),delivery=section.querySelector('#kcOpsDelivery');
  if(!status||!rows)return;
  try{
   const d=await post('commissioner-dashboard');
   if(!section.isConnected)return;
   const weeks=[...new Set(d.games.map(g=>Number(g.week)))].sort((a,b)=>b-a);
   const chosenWeeks=weeks.slice(0,2),games=d.games.filter(g=>chosenWeeks.includes(Number(g.week)));
   status.textContent='Notification counts represent push-service acceptance, not confirmation a manager read the alert.';
   rows.innerHTML=games.map(g=>{
    const missing=g.managers.filter(m=>!m.submitted);
    const pct=g.total?Math.round(100*g.submitted/g.total):0;
    return '<div class="item"><b>Week '+escHtml(g.week)+' — Pick '+escHtml(g.pick_no)+': '+escHtml(g.away)+' vs '+escHtml(g.home)+'</b>'+
     '<div class="row between" style="margin:9px 0"><span>'+g.submitted+'/'+g.total+' submitted</span><span class="note">'+g.notified+' invitation'+(g.notified===1?'':'s')+' accepted</span></div>'+
     '<div style="height:8px;background:#29443a;border-radius:12px;overflow:hidden"><div style="height:8px;width:'+pct+'%;background:#d5ad55"></div></div>'+
     '<details style="margin:10px 0"><summary style="cursor:pointer">'+(missing.length?'Missing: '+escHtml(missing.map(m=>m.name).join(', ')):'✓ All submitted')+'</summary>'+
     g.managers.map(m=>'<div class="mini" style="padding:6px 0">'+escHtml(m.name)+': '+(m.submitted?'✓ Submitted':'Missing')+' · '+(m.registered?'Notifications enabled':'Not registered')+' · '+(m.invite_accepted?'Push accepted':'No confirmed push acceptance')+'</div>').join('')+
     '</details></div>';
   }).join('')||'<p class="note">No GameDay matchups found.</p>';
   const names=new Map((d.registrations||[]).map(m=>[m.id,m.name]));
   delivery.innerHTML='<p>Accepted means the push provider accepted the message; it does not confirm it was displayed or read.</p>'+
    (d.delivery_events||[]).slice(0,25).map(x=>'<div class="mini item">'+escHtml(new Date(x.created_at).toLocaleString())+' · '+escHtml(names.get(x.member_id)||'Commissioner')+' · '+escHtml(x.notification_type)+' · '+escHtml(x.status)+'</div>').join('')+
    '<p class="note">Earlier notifications, sent before receipt logging was enabled, may not have device-level receipts.</p>';
  }catch(err){status.textContent='Dashboard unavailable: '+err.message}
 };
 section.querySelector('#kcOpsRefresh').onclick=load;
 load();
}
function archive(){
 const root=document.getElementById('eventDetail');if(!root||root.querySelector('#kcWeekArchive'))return;
 const section=document.createElement('details');section.id='kcWeekArchive';section.className='card';
 section.innerHTML='<summary style="font-size:18px;font-weight:750;cursor:pointer">📚 Past GameDay Weeks</summary><div id="kcArchivedRows" class="note">Loading past games…</div>';
 root.appendChild(section);
 (async()=>{
  try{
   const weeks=await rpcOps('gd_history_weeks'),now=Date.now(),latest=Math.max(0,...weeks.map(w=>Number(w.week)));
   const savedGames=data.events.find(e=>e.id==='e5')?.gameday?.games||[];
   const completedWeek=week=>{
    const matchups=weeks.filter(x=>Number(x.week)===Number(week));
    return matchups.length>0&&matchups.every(x=>savedGames.some(g=>Number(g.week)===Number(x.week)&&Number(g.pick_no||1)===Number(x.pick_no)&&!!g.winner));
   };
   const past=weeks.filter(w=>Date.parse(w.kickoff)<=now&&(Number(w.week)<latest||completedWeek(w.week)));
   if(!section.isConnected)return;
   section.querySelector('#kcArchivedRows').innerHTML=past.length?past.map(w=>
    '<details class="item"><summary style="cursor:pointer"><b>Week '+escHtml(w.week)+' — Pick '+escHtml(w.pick_no)+' · '+escHtml(w.away)+' vs '+escHtml(w.home)+'</b></summary>'+
    '<p class="note">Kickoff: '+escHtml(new Date(w.kickoff).toLocaleString())+
    ' · Winner: '+escHtml(savedGames.find(g=>Number(g.week)===Number(w.week)&&Number(g.pick_no||1)===Number(w.pick_no))?.winner||'Awaiting official result')+'</p>'+
    data.members.map(m=>'<div class="mini" style="padding:5px 0">'+escHtml(m.name)+': '+escHtml(w.picks?.[m.id]||'No pick')+'</div>').join('')+'</details>'
    ).join(''):'<p class="note">Previous weeks will appear here after a new week is created.</p>';
  }catch(err){if(section.isConnected)section.querySelector('#kcArchivedRows').textContent='Unable to load history: '+err.message}
 })();
}
const previous=gameDayDetail;
gameDayDetail=function(e){previous(e);if(e.id!=='e5')return;if(isAdmin())dashboard(e);archive()};
function backups(){
 if(!isAdmin())return;
 const root=document.getElementById('manage');if(!root||document.getElementById('kcOpsBackups'))return;
 const box=document.createElement('section');box.className='card';box.id='kcOpsBackups';
 box.innerHTML='<h2>🛡️ Backups & Activity History</h2><p class="note">Automatic snapshots are taken before league-state edits and daily. Backups do not overwrite the live league unless you deliberately restore a downloaded copy.</p>'+
 '<button class="secondary full" id="kcMakeBackup">Save backup now</button>'+
 '<button class="secondary full" id="kcOpsBackupRefresh" style="margin-top:8px">Refresh history</button>'+
 '<details style="margin-top:14px"><summary>Saved backups</summary><div id="kcOpsBackupList">Loading…</div></details>'+
 '<details style="margin-top:14px"><summary>Recent league activity</summary><div id="kcOpsActivity">Loading…</div></details>';
 root.appendChild(box);
 const load=async()=>{
  try{
   const h=await rpcOps('kingcup_commissioner_history');
   const list=box.querySelector('#kcOpsBackupList'),act=box.querySelector('#kcOpsActivity');if(!list||!act)return;
   list.innerHTML=(h.backups||[]).map(b=>'<div class="item"><span>'+escHtml(new Date(b.at).toLocaleString())+' · '+escHtml(b.source)+'</span> <button class="secondary" data-kc-download-backup="'+b.id+'">Download</button></div>').join('')||'<p class="note">No backups.</p>';
   act.innerHTML=(h.activity||[]).map(a=>'<div class="mini item">'+escHtml(new Date(a.at).toLocaleString())+' · '+escHtml(a.action)+' · '+escHtml(JSON.stringify(a.details||{}))+'</div>').join('')||'<p class="note">No activity recorded yet.</p>';
   list.querySelectorAll('[data-kc-download-backup]').forEach(btn=>btn.onclick=async()=>{
    btn.disabled=true;
    try{
     const state=await rpcOps('kingcup_commissioner_backup_export',{p_id:Number(btn.dataset.kcDownloadBackup)});
     const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
     const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kingcup-backup-'+btn.dataset.kcDownloadBackup+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
    }catch(err){alert('Backup download failed: '+err.message)}finally{btn.disabled=false}
   });
  }catch(err){const x=box.querySelector('#kcOpsBackupList');if(x)x.textContent='Unable to load backups: '+err.message}
 };
 box.querySelector('#kcMakeBackup').onclick=async()=>{const btn=box.querySelector('#kcMakeBackup');btn.disabled=true;try{await rpcOps('kingcup_commissioner_backup',{p_reason:'commissioner manual'});await load();btn.textContent='✓ Backup saved';}catch(err){alert(err.message)}finally{btn.disabled=false}};
 box.querySelector('#kcOpsBackupRefresh').onclick=load;
 load();
}
const obs=new MutationObserver(()=>backups());obs.observe(document.body,{subtree:true,childList:true});backups();
})();