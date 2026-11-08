(()=>{
if(new URLSearchParams(location.search).has('gd_token')||new URLSearchParams(location.search).has('cc_token'))return;
const ENDPOINT='https://jtptfoujwxqgqhcezndb.supabase.co/functions/v1/kingcup-push';
const savedKey='kingcup-manager-push-code';
const hasPush=()=>('serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window);
const isHome=()=>!(/iPhone|iPad|iPod/.test(navigator.userAgent))||navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function call(action,payload={},admin=false){
 const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',...(admin&&session?{'Authorization':'Bearer '+session.access_token}:{})},body:JSON.stringify({action,...payload})});
 const v=await r.json().catch(()=>({}));if(!r.ok)throw Error(v.error||'KingCup request failed');return v;
}
let showManager=false;
async function loadPicks(){
 const code=localStorage.getItem(savedKey);if(!code)return;
 const root=document.getElementById('kcManagerPicks');if(!root)return;
 try{const v=await call('manager-picks',{code});
  root.innerHTML='<b>🏈 '+safe(v.name)+' — Your GameDay picks</b><p class="note">Push notifications are linked to this phone. Choose your pending picks below.</p>'+
  (v.picks.length?v.picks.map(p=>'<div class="item"><b>Week '+p.week+' — Pick '+p.pick_no+'</b><p class="note">'+safe(p.away)+' vs '+safe(p.home)+' · '+(p.submitted?'✓ Submitted':'Not submitted')+'</p><a class="btn" style="display:inline-block;text-decoration:none" href="'+safe(p.url)+'">'+(p.submitted?'View or change pick':'Make my pick')+'</a></div>').join(''):'<p class="note">No current GameDay matchups. You will be notified when new picks are published.</p>')+
  '<button type="button" class="secondary" id="kcRefreshMyPicks">Refresh my picks</button>';
  root.querySelector('#kcRefreshMyPicks').onclick=loadPicks;
 }catch(e){root.textContent='Could not load your picks: '+e.message}
}
async function enable(){
 const button=document.getElementById('kcManagerEnable'),status=document.getElementById('kcManagerStatus');
 if(button)button.disabled=true;
 try{
  const code=(document.getElementById('kcManagerCode')?.value||'').trim().toLowerCase();
  if(!/^[a-f0-9]{36}$/.test(code))throw Error('Enter your personal setup code from the commissioner.');
  if(!hasPush())throw Error('This browser does not support push. On iPhone, use KingCup from your Home Screen.');
  if(!isHome())throw Error('On iPhone, open KingCup using its Home Screen icon, not Safari.');
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('Allow notifications in iPhone Settings to receive GameDay updates.');
  const key=await call('manager-public-key');
  const worker=await navigator.serviceWorker.register('./kingcup-push-sw.js');
  const subscription=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(key.publicKey)});
  const result=await call('manager-register',{code,subscription:subscription.toJSON()});
  localStorage.setItem(savedKey,code);
  if(status)status.textContent='✓ Notifications enabled for '+result.name+'.';
  await loadPicks();
 }catch(e){if(status)status.textContent=e.message||'Could not enable notifications.'}
 finally{if(button)button.disabled=false}
}
function managerUI(){
 // Show the manager registration and personal picks only inside the GameDay tab.
 if(typeof tab==='undefined'||tab!=='events'||chosen!=='e5')return;
 if(document.getElementById('kcManagerSetup'))return;
 const destination=document.getElementById('eventDetail');if(!destination||!destination.parentElement)return;
 const c=document.createElement('div');c.id='kcManagerSetup';c.className='card';
 const existing=!!localStorage.getItem(savedKey);
 c.innerHTML='<details '+(existing?'':'')+'><summary style="cursor:pointer;font-weight:750;font-size:17px">🔔 GameDay pick notifications '+(existing?'✓':'')+'</summary><p class="note">Get your new GameDay picks and one reminder if you are missing a pick. On iPhone, open KingCup from its Home Screen icon.</p>'+
 '<label for="kcManagerCode">Your personal setup code (commissioner provides once)</label><input id="kcManagerCode" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste your private setup code" value="'+safe(localStorage.getItem(savedKey)||'')+'">'+
 '<button type="button" id="kcManagerEnable" class="full" style="margin-top:9px">Enable my GameDay notifications</button><p class="note" role="status" id="kcManagerStatus">'+(existing?'This device has previously been registered.':'Only your own GameDay picks will be displayed.')+'</p></details><div id="kcManagerPicks" style="margin-top:10px"></div>';
 destination.parentElement.insertBefore(c,destination);c.querySelector('#kcManagerEnable').addEventListener('click',enable);loadPicks();
}
function commissionerUI(){
 if(!(typeof editing!=='undefined'&&editing&&session))return;
 const root=document.getElementById('manage');if(!root||document.getElementById('kcManagerCodesAdmin'))return;
 const c=document.createElement('section');c.className='card';c.id='kcManagerCodesAdmin';
 c.innerHTML='<h2>Manager GameDay notifications</h2><p class="note">Generate each manager’s private, permanent setup code. Send each code privately once, never to the group. Managers then receive personalized picks and reminders automatically after you create each matchup.</p><button id="kcGetManagerCodes" class="full">View manager setup codes and registration status</button><div id="kcManagerCodeList"></div>';
 root.prepend(c);
 c.querySelector('#kcGetManagerCodes').onclick=async()=>{const b=c.querySelector('#kcGetManagerCodes');b.disabled=true;try{
 const v=await call('setup-codes',{},true);const area=c.querySelector('#kcManagerCodeList');
 area.innerHTML='<p class="note">Share the matching code privately with each manager. These codes grant access to that manager’s GameDay picks.</p>'+
 v.managers.map((m,i)=>'<div class="item"><b>'+safe(m.member_name)+'</b> — '+(m.enabled?'✓ Notifications enabled':'Not registered')+'<p style="overflow-wrap:anywhere" class="note">'+safe(m.setup_code)+'</p><button type="button" class="secondary" data-kc-copy="'+i+'">Copy setup code</button></div>').join('');
 area.querySelectorAll('[data-kc-copy]').forEach(btn=>btn.onclick=async()=>{const m=v.managers[Number(btn.dataset.kcCopy)];const msg='Here is your personal code. Copy and paste it in the app.\n\n'+m.setup_code;try{await navigator.clipboard.writeText(msg);btn.textContent='Code copied — send privately'}catch{alert(msg)}});
 }catch(e){c.querySelector('#kcManagerCodeList').textContent=e.message;}finally{b.disabled=false}};
}
const observer=new MutationObserver(()=>{managerUI();commissionerUI()});observer.observe(document.body,{subtree:true,childList:true});managerUI();commissionerUI();
window.kcGameDayPublish=async links=>{if(!Array.isArray(links)||!links.length)return false;const input=links.map(l=>({week:Number(l.week),pick_no:Number(l.pick_no||1),id:String(l.id),token:String(l.token||'')}));try{await call('publish-links',{links:input},true);return true}catch(e){console.warn('GameDay push queuing failed:',e.message);alert('GameDay links were created, but automatic push delivery could not be queued: '+e.message+'. Please use the manual text links for these picks.');return false}};
})();