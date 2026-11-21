/* Private GameDay submissions: no private selections enter league_state. */
(()=>{
const token=new URLSearchParams(location.search).get('gd_token');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let weeks=[],adminWeeks=[],createdLinks=[],phones={};
function linkMessage(l){return '🏈 GameDay Pick of the Week\nTap to make your pick: '+l.url;}
function smsLink(l){const number=phones[l.id];if(!number){toast('Save a phone number for '+l.name+' under Manager phone numbers first');return}location.href='sms:'+number+'&body='+encodeURIComponent(linkMessage(l));}
function phonePanel(root){const panel=document.createElement('details');panel.className='item';panel.innerHTML='<summary style="cursor:pointer;font-weight:700;font-size:17px">Manager phone numbers ▾</summary><p class="note">Only you can access saved numbers. Enter each 10-digit number once. Text Link opens an individually addressed message; you tap Send in Messages.</p>'+data.members.map(m=>'<label>'+safe(m.name)+'</label><div style="display:flex;gap:8px"><input type="tel" inputmode="tel" placeholder="10-digit phone number" data-phone="'+safe(m.id)+'" value="'+safe(phones[m.id]||'')+'"><button class="secondary" data-save-phone="'+safe(m.id)+'">Save</button></div>').join('');root.appendChild(panel);panel.querySelectorAll('[data-save-phone]').forEach(b=>b.onclick=async()=>{const id=b.dataset.savePhone,number=panel.querySelectorAll('[data-phone]');const input=Array.from(number).find(el=>el.dataset.phone===id);b.disabled=true;try{await rpc('gd_phone_save',{p_member_id:id,p_phone:input.value},true);phones=await rpc('gd_phone_list',{},true);toast('Phone number saved')}catch(err){toast(err.message)}finally{b.disabled=false}});}
function linkButtons(result){if(!result||!createdLinks.length)return;result.innerHTML='<details><summary style="cursor:pointer;font-weight:700">📩 Manual backup links (optional)</summary><p class="note">Push notifications are sent automatically to registered managers. Use these links only for a manager whose notifications are unavailable. Keep this page open until you finish sharing any backup links.</p>'+createdLinks.map((l,i)=>'<div class="item"><b>'+safe(l.name)+'</b> '+(phones[l.id]?'('+safe(phones[l.id])+')':'(no saved number)')+'<br><button class="secondary" data-text-link="'+i+'">Text link</button> <button class="secondary" data-copy-link="'+i+'">Copy link</button></div>').join('')+'<button id="privCopyAll" class="secondary full">Copy all links</button></details>';result.querySelectorAll('[data-text-link]').forEach(b=>b.onclick=()=>{const l=createdLinks[Number(b.dataset.textLink)];smsLink(l);});result.querySelectorAll('[data-copy-link]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(createdLinks[Number(b.dataset.copyLink)].url).then(()=>toast('Link copied')).catch(()=>toast('Copy unavailable in this browser')));result.querySelector('#privCopyAll').onclick=()=>navigator.clipboard.writeText(createdLinks.map(l=>l.name+': '+l.url).join('\n')).then(()=>toast('All links copied')).catch(()=>toast('Copy unavailable in this browser'));}
async function rpc(name,params={},admin=false){
 const response=await api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(params)},admin);
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw Error(payload?.message||payload?.error||'Request failed');
 return payload;
}
function updatePublicGameDayCounts(){
 for(const w of weeks){
  const row=document.querySelector('#privateGameDay .kc-public-pick-count[data-week="'+Number(w.week)+'"][data-pick="'+Number(w.pick_no||1)+'"]');
  if(!row)continue;
  const total=Math.max(0,Number(w.total)||0),submitted=Math.min(total,Math.max(0,Number(w.submitted)||0));
  const label=row.querySelector('.kc-public-count-label'),fill=row.querySelector('.kc-public-count-fill');
  if(label)label.textContent=submitted+' / '+total+' picks submitted';
  if(fill)fill.style.width=(total?Math.round(100*submitted/total):0)+'%';
 }
}
let privateGameDayInitiallyLoaded=false;
async function refreshPrivate(force=false){
 try{
  const onGameDay=chosen==='e5'&&tab==='events';
  // Never replace an active GameDay editor during a scheduled poll.
  // Explicit refreshes and the first private-data load may render.
  weeks=await rpc('gd_public_weeks');
  window.kcGameDayLatestWeeks=weeks;
  if(editing&&session)adminWeeks=await rpc('gd_admin_status',{},true);
  else adminWeeks=[];
  if(editing&&session)phones=await rpc('gd_phone_list',{},true);
  if(onGameDay&&(force||!privateGameDayInitiallyLoaded))render();
  else if(onGameDay)updatePublicGameDayCounts();
  privateGameDayInitiallyLoaded=true;
 }catch(err){console.warn('Private GameDay refresh:',err.message);}
}
async function espnLookup(root){
 const status=root.querySelector('#espnStatus'),date=root.querySelector('#espnDate').value;
 if(!date)return toast('Choose a game date');
 status.textContent='Checking ESPN college football schedule…';
 try{
 const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=200&dates='+date.replace(/-/g,''));if(!r.ok)throw Error('ESPN schedule unavailable');
 const payload=await r.json(),events=(payload.events||[]).filter(e=>e.competitions?.[0]?.competitors?.length===2);
 const options=events.map(e=>{const c=e.competitions[0].competitors,away=c.find(x=>x.homeAway==='away'),home=c.find(x=>x.homeAway==='home');return {id:e.id,away:away?.team?.displayName,home:home?.team?.displayName,kickoff:e.date,completed:e.status?.type?.completed,winner:c.find(x=>x.winner)?.team?.displayName,score:c.map(x=>x.team?.abbreviation+': '+(x.score||'—')).join(' · ')} }).filter(x=>x.away&&x.home);
 if(!options.length){status.textContent='No games returned. Try another date or enter teams manually.';return}
 status.innerHTML='<p class="note">ESPN schedule results are not necessarily the College GameDay featured matchup. Confirm against ESPN’s announcement before using.</p><select id="espnGame"><option value="">Choose the confirmed GameDay matchup</option>'+options.map((e,i)=>'<option value="'+i+'">'+safe(e.away)+' at '+safe(e.home)+' — '+safe(new Date(e.kickoff).toLocaleString())+'</option>').join('')+'</select><button class="secondary full" id="espnUse">Use selected matchup</button><p id="espnSelected" class="note"></p>';
 status.querySelector('#espnUse').onclick=()=>{const i=status.querySelector('#espnGame').value;if(i==='')return toast('Select a game');const e=options[Number(i)];root.querySelector('#privAway').value=e.away;root.querySelector('#privHome').value=e.home;const d=new Date(e.kickoff);root.querySelector('#privKickoff').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);status.querySelector('#espnSelected').textContent='Loaded '+e.away+' at '+e.home+(e.completed?' · Final: '+e.score:'')+'. Confirm week number and kickoff before creating invitations.';toast('ESPN matchup loaded')};
 }catch(err){status.textContent='ESPN schedule could not be loaded here. You can still enter the matchup manually. '+err.message}
}
function privatePanel(){
 const root=document.createElement('section');root.className='card';root.id='privateGameDay';
 const now=Date.now();
 const currentWeek=weeks.filter(w=>Date.parse(w.kickoff)>now).sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff))[0]?.week;
 const latestWeek=Math.max(0,...weeks.map(w=>Number(w.week)));
 const latestGames=weeks.filter(w=>Number(w.week)===latestWeek);
 const allCurrentGamesLocked=latestGames.length>0&&latestGames.every(w=>now>=Date.parse(w.kickoff));
 root.innerHTML='<details class="kc-private-results"'+(allCurrentGamesLocked?'':' open')+'><summary style="cursor:pointer;font-size:1.25em;font-weight:750">🏈 GameDay picks & results</summary><p class="note">Each matchup reveals everyone’s picks at its own kickoff. Games that start later stay private and editable until they begin.</p>'+
 weeks.slice().sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff)||Number(a.pick_no||1)-Number(b.pick_no||1)).map(w=>{
 const locked=now>=Date.parse(w.kickoff),status=adminWeeks.find(a=>a.week===w.week&&Number(a.pick_no||1)===Number(w.pick_no||1)),pickNo=Number(w.pick_no||1);
 const official=(data.events.find(e=>e.id==='e5')?.gameday?.games||[]).find(g=>Number(g.week)===Number(w.week)&&Number(g.pick_no||1)===pickNo);
 return '<div class="item"><b>Week '+safe(w.week)+(pickNo>1?' — Pick '+pickNo:' — Pick 1')+': '+safe(w.away)+' vs '+safe(w.home)+'</b><p class="note">Kickoff: '+safe(new Date(w.kickoff).toLocaleString())+' · '+(locked?'Locked — picks revealed':'Picks hidden until kickoff')+'</p>'+
 '<div class="kc-public-pick-count" data-week="'+safe(w.week)+'" data-pick="'+safe(pickNo)+'" style="margin:12px 0 16px">'+
 '<div class="kc-public-count-label" style="font-weight:650;margin-bottom:7px">'+safe(Math.min(Number(w.total)||0,Number(w.submitted)||0))+' / '+safe(Number(w.total)||0)+' picks submitted</div>'+
 '<div style="height:9px;background:#29443a;border-radius:12px;overflow:hidden"><div class="kc-public-count-fill" style="height:100%;width:'+safe(Number(w.total)?Math.round(100*Number(w.submitted||0)/Number(w.total)):0)+'%;background:#d5ad55;border-radius:12px"></div></div></div>'+(locked&&official?.winner?'<p class="note">Winner: '+safe(official.winner)+'</p>':'')+
 (locked?'<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px 12px;margin:12px 0"><div style="font-weight:700;border-bottom:1px solid #41634d;padding-bottom:6px">Manager</div><div style="font-weight:700;border-bottom:1px solid #41634d;padding-bottom:6px">Pick</div>'+data.members.map(m=>'<div style="min-width:0;overflow-wrap:anywhere">'+safe(m.name)+'</div><div style="min-width:0;overflow-wrap:anywhere">'+safe(w.picks?.[m.id]||'No pick')+(locked&&official?.winner&&w.picks?.[m.id]?(w.picks[m.id]===official.winner?' ✓':' ✕'):'')+'</div>').join('')+'</div>':'<p class="note">Other managers cannot see selections yet.</p>')+
 (editing&&session&&locked&&status?'<details style="margin:8px 0"><summary style="cursor:pointer">Backup: Text everyone’s picks</summary><button class="secondary full" data-text-all-picks="'+safe(w.week)+'" data-text-all-pick="'+safe(pickNo)+'">Text all picks — Week '+safe(w.week)+'</button></details>':'')+
 (editing&&session&&!locked&&status?'<button class="danger" data-cancel-gd-week="'+safe(w.week)+'" data-cancel-gd-pick="'+safe(pickNo)+'" style="margin:12px 0;width:100%">Cancel this matchup &amp; invalidate links</button>':'')+
 (editing&&status?'<details><summary><b>Commissioner pick tracker — Week '+safe(w.week)+' Pick '+pickNo+'</b></summary>'+status.members.map(m=>'<div class="mini">'+safe(m.name)+': '+(m.submitted?'Submitted':'Not submitted')+(m.submitted?' — '+safe(m.pick):'')+(w.week===currentWeek?' <button class="secondary" data-resend-week="'+safe(w.week)+'" data-resend-pick="'+safe(pickNo)+'" data-resend-member="'+safe(m.id)+'">Resend link</button>':'')+'</div>').join('')+'</details>'+
 '<details class="item" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">✏️ Commissioner: Enter or change a manager’s pick</summary>'+
 '<p class="note">Authorized commissioner correction. Works before or after kickoff; all changes are recorded.</p>'+
 '<label>Manager</label><select data-override-manager="'+safe(w.week)+'-'+safe(pickNo)+'"><option value="">Choose manager</option>'+
 status.members.map(m=>'<option value="'+safe(m.id)+'">'+safe(m.name)+(m.pick?' — '+safe(m.pick):' — No pick')+'</option>').join('')+'</select>'+
 '<label>Winning team selected by manager</label><select data-override-team="'+safe(w.week)+'-'+safe(pickNo)+'"><option value="">Choose their pick</option>'+
 '<option value="'+safe(w.away)+'">'+safe(w.away)+'</option><option value="'+safe(w.home)+'">'+safe(w.home)+'</option></select>'+
 '<button type="button" class="secondary full" data-override-save="'+safe(w.week)+'-'+safe(pickNo)+'" data-week="'+safe(w.week)+'" data-pick="'+safe(pickNo)+'" style="margin-top:10px">Save manager’s pick</button>'+
 '<p class="note" role="status" data-override-status="'+safe(w.week)+'-'+safe(pickNo)+'"></p></details>':'')+'</div>';
 }).join('')+'</details>'+ 
 (editing&&session?'<div class="item"><h3>🏈 Create GameDay Matchup</h3>'+
 '<p class="note">Choose Pick 1 or Pick 2, select a matchup, then create it. Notifications are sent automatically.</p>'+
 '<label for="privWeek">Week</label><input id="privWeek" type="number" min="1" step="1" inputmode="numeric">'+
 '<label for="privPickNo">Pick number</label><select id="privPickNo"><option value="1">Pick 1</option><option value="2">Pick 2</option></select>'+
 '<label for="espnDate">Game date</label><input id="espnDate" type="date">'+
 '<button type="button" id="espnFind" class="secondary full">Find matchup on ESPN</button><div id="espnStatus"></div>'+
 '<p class="note">Or enter the two teams and kickoff manually below.</p>'+
 '<label for="privAway">Away team</label><input id="privAway" placeholder="Away team">'+
 '<label for="privHome">Home team</label><input id="privHome" placeholder="Home team">'+
 '<label for="privKickoff">Kickoff (local time)</label><input id="privKickoff" type="datetime-local">'+
 '<button type="button" id="privCreate" class="full">Create Pick &amp; Notify Managers</button>'+
 '<div id="privResult"></div></div>'+
 '<details class="item"><summary style="cursor:pointer;font-weight:650">📩 Backup texting &amp; phone numbers</summary>'+
 '<p class="note">Use only if a manager cannot receive push notifications.</p><div id="privBackupPhones"></div></details>'+
 '<button id="privRefresh" class="secondary full">Refresh submission status</button>':'');
 if(editing&&session){
 phonePanel(root.querySelector('#privBackupPhones'));
 root.querySelectorAll('[data-text-all-picks]').forEach(b=>b.onclick=()=>{
  const week=Number(b.dataset.textAllPicks),pickNo=Number(b.dataset.textAllPick||1),w=weeks.find(x=>Number(x.week)===week&&Number(x.pick_no||1)===pickNo),status=adminWeeks.find(x=>Number(x.week)===week&&Number(x.pick_no||1)===pickNo);
  if(!w||!status||Date.now()<Date.parse(w.kickoff))return toast('Picks are not locked yet');
  const recipients=[...new Set(data.members.map(m=>String(phones[m.id]||'').replace(/[^0-9+]/g,'')).filter(Boolean))];
  if(!recipients.length)return toast('No saved manager phone numbers');
  const missing=data.members.filter(m=>!phones[m.id]).map(m=>m.name);
  if(missing.length&&!confirm('Missing phone numbers for: '+missing.join(', ')+'. Open group text for the others?'))return;
  const message='🏈 GameDay Week '+week+' Pick '+pickNo+' — Locked Picks\n'+w.away+' vs '+w.home+'\n\n'+data.members.map(m=>{
   const p=status.members.find(x=>x.id===m.id);
   return m.name+': '+(p?.pick||'No pick');
  }).join('\n\n');
  location.href='sms://open?addresses='+recipients.join(',')+';?&body='+encodeURIComponent(message);
 });
 root.querySelectorAll('[data-override-save]').forEach(button=>button.onclick=async()=>{
  const key=button.dataset.overrideSave,week=Number(button.dataset.week),pickNo=Number(button.dataset.pick);
  const manager=root.querySelector('[data-override-manager="'+key+'"]')?.value;
  const pick=root.querySelector('[data-override-team="'+key+'"]')?.value;
  const label=root.querySelector('[data-override-status="'+key+'"]');
  const match=weeks.find(w=>Number(w.week)===week&&Number(w.pick_no||1)===pickNo);
  const existing=adminWeeks.find(w=>Number(w.week)===week&&Number(w.pick_no||1)===pickNo)?.members.find(m=>m.id===manager);
  if(!manager||!pick){if(label)label.textContent='Choose a manager and a team first.';return;}
  if(existing?.pick===pick){if(label)label.textContent='That manager already has this pick saved.';return;}
  const after=match&&Date.now()>=Date.parse(match.kickoff);
  const managerName=existing?.name||'this manager';
  if(!confirm('Record '+managerName+' picking '+pick+' for Week '+week+' Pick '+pickNo+'?'+
     (after?'\\n\\nThe game has already started. This is a late commissioner override and will be recorded.':'')))return;
  button.disabled=true;if(label)label.textContent='Saving correction…';
  try{
   const result=await rpc('gd_commissioner_set_pick',{p_week:week,p_pick_no:pickNo,p_member_id:manager,p_pick:pick},true);
   if(label)label.textContent='✓ Saved'+(result.late?' after kickoff':'')+'.';
   if(result.official_synced)await loadCloud();
   await refreshPrivate(true);
   toast('Commissioner pick saved for '+managerName);
  }catch(err){if(label)label.textContent='Not saved: '+err.message;button.disabled=false;}
 });
 root.querySelectorAll('[data-cancel-gd-week]').forEach(b=>b.onclick=async()=>{
  const week=Number(b.dataset.cancelGdWeek),pickNo=Number(b.dataset.cancelGdPick);
  const match=weeks.find(w=>Number(w.week)===week&&Number(w.pick_no||1)===pickNo);
  const status=adminWeeks.find(w=>Number(w.week)===week&&Number(w.pick_no||1)===pickNo);
  if(!match||Date.now()>=Date.parse(match.kickoff))return toast('This matchup has already kicked off and cannot be canceled.');
  const submitted=status?.members?.filter(m=>m.submitted).length||0;
  const description='Week '+week+' — Pick '+pickNo+': '+match.away+' vs '+match.home;
  if(!confirm('CANCEL '+description+'?\n\nAll existing links will stop working. '+submitted+' already submitted pick(s) will be deleted.\n\nYou must create a NEW matchup and send NEW links to everyone. Week '+week+' other picks will not be affected.'))return;
  b.disabled=true;
  try{
   const v=await rpc('gd_cancel_pick',{p_week:week,p_pick_no:pickNo},true);
   createdLinks=createdLinks.filter(l=>!(Number(l.week)===week&&Number(l.pick_no||1)===pickNo));
   await refreshPrivate(true);
   toast('Week '+week+' Pick '+pickNo+' canceled. Create the replacement and send new links.');
  }catch(err){toast('Cancel failed: '+err.message);b.disabled=false}
 });
 root.querySelectorAll('[data-resend-week]').forEach(b=>b.onclick=async()=>{
  const week=Number(b.dataset.resendWeek),pickNo=Number(b.dataset.resendPick||1),id=b.dataset.resendMember;
  if(!phones[id])return toast('Save this manager’s phone number first');
  if(!confirm('Resend this week’s link? Their previous link will stop working, but their saved pick will remain.'))return;
  b.disabled=true;
  try{const l=await rpc('gd_resend_pick',{p_week:week,p_pick_no:pickNo,p_member_id:id},true);
   await window.kcGameDayPublish?.([{id:l.id,token:l.token,week,pick_no:pickNo}]);
   smsLink({id:l.id,name:l.name,week:l.week,away:l.away,home:l.home,url:location.origin+location.pathname+'?gd_token='+encodeURIComponent(l.token)});
  }catch(err){toast(err.message)}finally{b.disabled=false}
 });
 const mostRecent=Math.max(0,...weeks.map(w=>Number(w.week)));
 const hasPick1=weeks.some(w=>Number(w.week)===mostRecent&&Number(w.pick_no||1)===1);
 const hasPick2=weeks.some(w=>Number(w.week)===mostRecent&&Number(w.pick_no||1)===2);
 root.querySelector('#privWeek').value=hasPick1&&!hasPick2?mostRecent:Math.max(1,mostRecent+1);
 root.querySelector('#privPickNo').value=hasPick1&&!hasPick2?'2':'1';
 root.querySelector('#espnDate').value=new Date().toISOString().slice(0,10);
 root.querySelector('#espnFind').onclick=()=>espnLookup(root);
 linkButtons(root.querySelector('#privResult'));
 root.querySelector('#privRefresh').onclick=()=>refreshPrivate(true);
 root.querySelector('#privCreate').onclick=async()=>{
 const week=Number(root.querySelector('#privWeek').value),pickNo=Number(root.querySelector('#privPickNo').value);
 const away=root.querySelector('#privAway').value.trim(),home=root.querySelector('#privHome').value.trim(),raw=root.querySelector('#privKickoff').value;
 const kickoff=new Date(raw);
 if(!Number.isInteger(week)||week<1||![1,2].includes(pickNo)||!away||!home||away.toLowerCase()===home.toLowerCase()||!raw||!Number.isFinite(kickoff.getTime())||kickoff.getTime()<=Date.now())return toast('Enter a valid week, pick number, teams and future kickoff.');
 if(weeks.some(w=>Number(w.week)===week&&Number(w.pick_no||1)===pickNo))return toast('Week '+week+' Pick '+pickNo+' already exists. Nothing changed.');
 const btn=root.querySelector('#privCreate');btn.disabled=true;
 try{
  const links=await rpc('gd_create_pick',{p_week:week,p_pick_no:pickNo,p_away:away,p_home:home,p_kickoff:kickoff.toISOString(),p_members:data.members.map(m=>({id:m.id,name:m.name}))},true);
  createdLinks=links.map(l=>({id:l.id,name:l.name,week,pick_no:pickNo,away,home,url:location.origin+location.pathname+'?gd_token='+encodeURIComponent(l.token)}));
  const queued=await window.kcGameDayPublish?.(links.map(l=>({id:l.id,token:l.token,week,pick_no:pickNo})));
  toast(queued?'Week '+week+' Pick '+pickNo+' created — notifications queued':'Pick created; use backup links if notifications are unavailable.');
  linkButtons(root.querySelector('#privResult'));
  weeks=await rpc('gd_public_weeks');window.kcGameDayLatestWeeks=weeks;
  adminWeeks=await rpc('gd_admin_status',{},true);
  root.querySelector('#privPickNo').value=pickNo===1?'2':'1';
 }catch(err){toast('Could not create pick: '+err.message)}
 finally{btn.disabled=false}
 }
 }
 return root;
}
const original=gameDayDetail;
gameDayDetail=function(e){original(e);const detail=$('eventDetail');if(!detail?.parentElement)return;detail.parentElement.insertBefore(privatePanel(),detail)};
async function invitePage(){
 document.body.innerHTML='<main style="max-width:600px;margin:32px auto;padding:18px;font:16px system-ui"><h1>🏈 KingCup GameDay</h1><div id="invContent">Loading private invitation…</div><a href="./#gameday" id="gdReturnToGameDay" style="display:block;text-align:center;margin:24px 0;padding:15px 20px;background:#214b3c;color:#fff;border-radius:12px;font-weight:700;text-decoration:none">← Return to GameDay</a></main>';
 const area=document.getElementById('invContent');
 async function load(){
 try{
 const v=await rpc('gd_invitation',{p_token:token});
 const locked=v.locked||Date.now()>=Date.parse(v.kickoff);
 area.innerHTML='<h2>'+safe(v.name)+'</h2><p>Week '+safe(v.week)+': '+safe(v.away)+' vs '+safe(v.home)+'</p><p>Kickoff: '+safe(new Date(v.kickoff).toLocaleString())+'</p><p><b>'+(locked?'Picks are locked.':'Your pick is private until kickoff. You can reopen this same link and change your selection any time before kickoff; the most recent saved pick counts.')+'</b></p><p>Saved pick: '+safe(v.pick||'None yet')+'</p>'+(locked?'':'<label for="invPick">Choose your winner</label><select id="invPick" style="display:block;width:100%;padding:12px;margin:10px 0"><option value="">Select a team</option><option value="'+safe(v.away)+'" '+(v.pick===v.away?'selected':'')+'>'+safe(v.away)+'</option><option value="'+safe(v.home)+'" '+(v.pick===v.home?'selected':'')+'>'+safe(v.home)+'</option></select><button id="invSave" style="padding:12px 24px">Save my pick</button><p id="invMessage" role="status"></p>');
 if(!locked)document.getElementById('invSave').onclick=async()=>{
 const pick=document.getElementById('invPick').value;
 if(!pick)return document.getElementById('invMessage').textContent='Choose a team first.';
 const btn=document.getElementById('invSave');btn.disabled=true;
 try{await rpc('gd_submit',{p_token:token,p_pick:pick});await load();const msg=document.createElement('p');msg.textContent='✓ Your pick was saved.';area.appendChild(msg)}
 catch(err){document.getElementById('invMessage').textContent=err.message;btn.disabled=false}
 };
 }catch(err){area.textContent='Unable to open this invitation: '+err.message}
 }
 await load();
}
window.gdRefreshPrivate=()=>refreshPrivate(true);if(token)invitePage();else{refreshPrivate();setInterval(()=>refreshPrivate(false),60000);}
})();