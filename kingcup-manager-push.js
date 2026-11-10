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
 try{
  const v=await call('manager-picks',{code});
  if(!root.isConnected)return;
  const picks=v.picks||[];
  root.innerHTML='<h2>🏈 '+safe(v.name)+' — My GameDay Picks</h2>'+
   (picks.length?'<p class="note">Choose your winners, then save both picks together. You can change either pick until its own kickoff.</p>'+
   picks.map(p=>'<div class="item"><b>Week '+safe(p.week)+' — Pick '+safe(p.pick_no)+'</b>'+
   '<p class="note">'+safe(p.away)+' vs '+safe(p.home)+' · '+(p.submitted?'✓ Submitted':'Not submitted')+
   ' · Kickoff '+safe(new Date(p.kickoff).toLocaleString())+'</p>'+
   '<select data-kc-week="'+safe(p.week)+'" data-kc-pick="'+safe(p.pick_no)+'" aria-label="Week '+safe(p.week)+' Pick '+safe(p.pick_no)+'"><option value="">Select a winner</option>'+
   [p.away,p.home].map(name=>'<option value="'+safe(name)+'" '+(p.selection===name?'selected':'')+'>'+safe(name)+'</option>').join('')+
   '</select></div>').join('')+
   '<button type="button" id="kcSaveAllGameDay" class="full">Save My Picks</button>'+
   '<p id="kcSaveAllStatus" class="note" role="status"></p>':
   '<p class="note">No upcoming matchups. New GameDay picks will appear here automatically.</p>')+
   '<button type="button" class="secondary" id="kcRefreshMyPicks">Refresh my picks</button>';
  root.querySelector('#kcRefreshMyPicks').onclick=loadPicks;
  const save=root.querySelector('#kcSaveAllGameDay');
  if(save)save.onclick=async()=>{
   const selects=[...root.querySelectorAll('[data-kc-week][data-kc-pick]')];
   const selected=selects.filter(el=>el.value).map(el=>({week:Number(el.dataset.kcWeek),pick_no:Number(el.dataset.kcPick),pick:el.value}));
   const status=root.querySelector('#kcSaveAllStatus');
   if(!selected.length){status.textContent='Choose at least one team.';return}
   save.disabled=true;status.textContent='Saving your picks…';
   try{
    const result=await call('manager-batch-submit',{code,picks:selected});
    status.textContent='✓ '+result.saved+' pick'+(result.saved===1?'':'s')+' saved.';
    await loadPicks();
    const updated=document.getElementById('kcManagerPicks');
    if(updated){const p=document.createElement('p');p.className='note';p.textContent='✓ Your selections are saved.';updated.appendChild(p)}
   }catch(e){status.textContent=e.message||'Unable to save';save.disabled=false}
  };
 }catch(e){if(root.isConnected)root.textContent='Could not load your picks: '+e.message}
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
 ? '<div id="kcManagerPicks"></div>'
 : '<h2>🔔 GameDay pick notifications</h2><p class="note">One-time setup: choose your team, enter your 6-digit PIN and allow notifications.</p>'+
 '<label for="kcManagerTeam">Your team</label><select id="kcManagerTeam"><option value="">Loading teams…</option></select>'+
 '<label for="kcManagerPin">Your 6-digit PIN (from the commissioner)</label><input id="kcManagerPin" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" pattern="[0-9]{6}" placeholder="6-digit PIN">'+
 '<button type="button" id="kcManagerEnable" class="full" style="margin-top:10px">Enable Notifications</button>'+
 '<p class="note" role="status" id="kcManagerStatus">You only need to do this once.</p><div id="kcManagerPicks"></div>';
 destination.parentElement.insertBefore(c,destination);
 if(existing)loadPicks();
 else{c.querySelector('#kcManagerEnable').addEventListener('click',enable);showTeams();}
}
function commissionerBroadcastUI(){
 if(!(typeof editing!=='undefined'&&editing&&session))return;
 const root=document.getElementById('manage');
 if(!root||document.getElementById('kcBroadcastAdmin'))return;
 const panel=document.createElement('section');
 panel.id='kcBroadcastAdmin';panel.className='card';
 panel.innerHTML='<h2>📣 Send Push Notification</h2>'+
 '<p class="note">Send a KingCup announcement to everyone or selected managers. Only registered devices receive it.</p>'+
 '<label for="kcBroadcastTitle">Notification title</label><input id="kcBroadcastTitle" maxlength="90" placeholder="Example: KingCup update">'+
 '<label for="kcBroadcastBody">Your message</label><textarea id="kcBroadcastBody" maxlength="450" rows="4" placeholder="Type your announcement here"></textarea>'+
 '<div style="margin:14px 0 8px"><b>Recipients</b></div>'+
 '<label style="display:flex;align-items:center;gap:9px"><input type="checkbox" id="kcBroadcastAll" checked style="width:auto"> Everyone</label>'+
 '<div id="kcBroadcastMembers" style="margin:6px 0 14px" aria-label="Individual managers">Loading managers…</div>'+
 '<button type="button" id="kcBroadcastSend" class="full">Review & Send Notification</button>'+
 '<p class="note" id="kcBroadcastResult" role="status"></p>';
 root.prepend(panel);
 let managers=[];
 const all=panel.querySelector('#kcBroadcastAll');
 const list=panel.querySelector('#kcBroadcastMembers');
 const status=panel.querySelector('#kcBroadcastResult');
 const draw=()=>{
  list.innerHTML=managers.map((m,i)=>'<label style="display:flex;align-items:center;gap:9px;margin:7px 0"><input type="checkbox" style="width:auto" data-kc-recipient="'+i+'" '+(all.checked?'checked disabled':'')+'><span>'+safe(m.name)+'</span><span class="note" style="margin-left:auto">'+(m.devices?'✓ Enabled':'Not registered')+'</span></label>').join('');
 };
 all.addEventListener('change',draw);
 call('commissioner-push-targets',{},true).then(v=>{managers=v.managers||[];draw()}).catch(e=>{list.textContent='Unable to load managers: '+e.message});
 panel.querySelector('#kcBroadcastSend').addEventListener('click',async()=>{
  const btn=panel.querySelector('#kcBroadcastSend'),title=panel.querySelector('#kcBroadcastTitle').value.trim(),body=panel.querySelector('#kcBroadcastBody').value.trim();
  if(!title||!body){status.textContent='Enter a title and message first.';return;}
  if(!managers.length){status.textContent='Manager list is unavailable. Try reopening Manage.';return;}
  const recipients=all.checked?managers:managers.filter((m,i)=>list.querySelector('[data-kc-recipient="'+i+'"]')?.checked);
  if(!recipients.length){status.textContent='Select at least one manager.';return;}
  const enabled=recipients.filter(m=>m.devices>0).length;
  if(!enabled){status.textContent='None of the selected managers have registered notifications.';return;}
  const preview='Send this KingCup notification?\n\n'+title+'\n'+body+'\n\nRecipients: '+recipients.map(m=>m.name).join(', ')+(enabled<recipients.length?'\n\n'+(recipients.length-enabled)+' selected managers are not registered and will not receive it.':'');
  if(!confirm(preview))return;
  btn.disabled=true;status.textContent='Sending…';
  try{
   const reqId=crypto.randomUUID();
   const result=await call('commissioner-push-send',{request_id:reqId,title,body,member_ids:recipients.map(m=>m.id)},true);
   status.textContent='Sent to '+result.delivered+' device'+(result.delivered===1?'':'s')+'.'+(result.failed?' '+result.failed+' failed.':'')+(result.unregistered?.length?' Not registered: '+result.unregistered.join(', ')+'.':'');
   if(result.completed&&result.delivered){panel.querySelector('#kcBroadcastBody').value='';}
  }catch(e){status.textContent='Notification was not confirmed: '+e.message+'. Check before attempting another send.';}
  finally{btn.disabled=false;}
 });
}
const observer=new MutationObserver(()=>{managerUI();commissionerBroadcastUI()});observer.observe(document.body,{subtree:true,childList:true});managerUI();commissionerBroadcastUI();
window.kcGameDayPublish=async links=>{if(!Array.isArray(links)||!links.length)return false;const input=links.map(l=>({week:Number(l.week),pick_no:Number(l.pick_no||1),id:String(l.id),token:String(l.token||'')}));try{await call('publish-links',{links:input},true);return true}catch(e){console.warn('GameDay push queuing failed:',e.message);alert('GameDay links were created, but automatic push delivery could not be queued: '+e.message+'. Please use the manual text links for these picks.');return false}};
})();