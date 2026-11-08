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
 const btn=document.getElementById('kcManagerEnable'),status=document.getElementById('kcManagerStatus');
 if(btn)btn.disabled=true;
 try{
  const member_id=document.getElementById('kcManagerTeam')?.value;
  const pin=(document.getElementById('kcManagerPin')?.value||'').trim();
  if(!member_id)throw Error('Select your team name first.');
  if(!/^[0-9]{6}$/.test(pin))throw Error('Enter your 6-digit PIN.');
  if(!hasPush())throw Error('Push is unavailable here. On iPhone open KingCup from its Home Screen.');
  if(!isHome())throw Error('Open KingCup from its Home Screen icon, not Safari.');
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('Tap Allow for notifications, or enable them in iPhone Settings.');
  const key=await call('manager-public-key');
  const worker=await navigator.serviceWorker.register('./kingcup-push-sw.js');
  const subscription=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(key.publicKey)});
  const response=await call('manager-activate',{member_id,pin,subscription:subscription.toJSON()});
  localStorage.setItem(savedKey,response.code);
  const panel=document.getElementById('kcManagerSetup');
  if(panel)panel.remove();
  managerUI();
  await loadPicks();
 }catch(err){if(status)status.textContent=err.message||'Notification setup failed.'}
 finally{if(btn)btn.disabled=false}
}
async function showTeams(){
 const select=document.getElementById('kcManagerTeam');if(!select)return;
 try{
  const v=await call('manager-names');
  if(!document.getElementById('kcManagerTeam'))return;
  select.innerHTML='<option value="">Select your team</option>'+v.managers.map(m=>'<option value="'+safe(m.id)+'">'+safe(m.name)+'</option>').join('');
 }catch(e){select.innerHTML='<option value="">Unable to load team names</option>';const label=document.getElementById('kcManagerStatus');if(label)label.textContent=e.message}
}
function managerUI(){
 if(typeof tab==='undefined'||tab!=='events'||chosen!=='e5')return;
 if(document.getElementById('kcManagerSetup'))return;
 const destination=document.getElementById('eventDetail');if(!destination?.parentElement)return;
 const c=document.createElement('section');c.id='kcManagerSetup';c.className='card';
 const existing=!!localStorage.getItem(savedKey);
 c.innerHTML=existing
 ? '<h2>🏈 My GameDay Picks <span style="font-size:13px;color:#a4d8b1">✓ Notifications enabled</span></h2><p class="note">Your existing setup is saved. No further action needed.</p><div id="kcManagerPicks"></div>'
 : '<h2>🔔 GameDay pick notifications</h2><p class="note">One-time setup: choose your team, enter your 6-digit PIN and allow notifications.</p>'+
 '<label for="kcManagerTeam">Your team</label><select id="kcManagerTeam"><option value="">Loading teams…</option></select>'+
 '<label for="kcManagerPin">Your 6-digit PIN (from the commissioner)</label><input id="kcManagerPin" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" pattern="[0-9]{6}" placeholder="6-digit PIN">'+
 '<button type="button" id="kcManagerEnable" class="full" style="margin-top:10px">Enable Notifications</button>'+
 '<p class="note" role="status" id="kcManagerStatus">You only need to do this once.</p><div id="kcManagerPicks"></div>';
 destination.parentElement.insertBefore(c,destination);
 if(existing)loadPicks();
 else{c.querySelector('#kcManagerEnable').addEventListener('click',enable);showTeams();}
}
function commissionerUI(){
 if(!(typeof editing!=='undefined'&&editing&&session))return;
 const root=document.getElementById('manage');if(!root||document.getElementById('kcManagerCodesAdmin'))return;
 const c=document.createElement('section');c.className='card';c.id='kcManagerCodesAdmin';
 c.innerHTML='<h2>Manager GameDay notifications</h2><p class="note">Each manager selects their team and enters a personal 6-digit PIN once. Existing registrations keep working. Send each manager their PIN privately.</p><button id="kcGetManagerCodes" class="full">View manager PINs and registration status</button><div id="kcManagerCodeList"></div>';
 root.prepend(c);
 c.querySelector('#kcGetManagerCodes').onclick=async()=>{const b=c.querySelector('#kcGetManagerCodes');b.disabled=true;try{
 const v=await call('setup-codes',{},true);const area=c.querySelector('#kcManagerCodeList');
 area.innerHTML='<p class="note">Send each PIN privately. The manager selects their team in the GameDay tab and enters these 6 digits.</p>'+
 v.managers.map((m,i)=>'<div class="item"><b>'+safe(m.member_name)+'</b> — '+(m.enabled?'✓ Notifications enabled':'Not registered')+'<p class="note" style="font-size:20px;letter-spacing:3px;font-weight:750">'+safe(m.activation_pin||'PIN unavailable')+'</p><button type="button" class="secondary" data-kc-copy="'+i+'">Copy PIN message</button></div>').join('');
 area.querySelectorAll('[data-kc-copy]').forEach(btn=>btn.onclick=async()=>{const m=v.managers[Number(btn.dataset.kcCopy)];const msg='🏈 KingCup GameDay\n\nTeam: '+m.member_name+'\nPIN: '+m.activation_pin+'\n\n1. Open KingCup → GameDay.\n2. Select your team and enter your PIN.\n3. Tap Enable Notifications, then Allow.\n\nAlready set up? You’re all done!';try{await navigator.clipboard.writeText(msg);btn.textContent='Copied — send privately'}catch{alert(msg)}});
 }catch(e){c.querySelector('#kcManagerCodeList').textContent=e.message;}finally{b.disabled=false}};
}
const observer=new MutationObserver(()=>{managerUI();commissionerUI()});observer.observe(document.body,{subtree:true,childList:true});managerUI();commissionerUI();
window.kcGameDayPublish=async links=>{if(!Array.isArray(links)||!links.length)return false;const input=links.map(l=>({week:Number(l.week),pick_no:Number(l.pick_no||1),id:String(l.id),token:String(l.token||'')}));try{await call('publish-links',{links:input},true);return true}catch(e){console.warn('GameDay push queuing failed:',e.message);alert('GameDay links were created, but automatic push delivery could not be queued: '+e.message+'. Please use the manual text links for these picks.');return false}};
})();