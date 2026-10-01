/* Private GameDay submissions: no private selections enter league_state. */
(()=>{
const token=new URLSearchParams(location.search).get('gd_token');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let weeks=[],adminWeeks=[],createdLinks=[],testWeeks=[],testLinks=[],phones={};
try{const cached=JSON.parse(sessionStorage.getItem('kingcup_gd_test_links')||'[]');if(Array.isArray(cached))testLinks=cached}catch(e){}
function linkMessage(l){return 'KingCup GameDay: '+l.name+', make your private Week '+l.week+' pick ('+l.away+' vs '+l.home+') before kickoff. Your personal link: '+l.url+' — Please do not forward this link.';}
function smsLink(l){const number=phones[l.id];if(!number){toast('Save a phone number for '+l.name+' under Manager phone numbers first');return}location.href='sms:'+number+'&body='+encodeURIComponent(linkMessage(l));}
function phonePanel(root){const panel=document.createElement('div');panel.className='item';panel.innerHTML='<h3>Manager phone numbers</h3><p class="note">Only you can access saved numbers. Enter each 10-digit number once. Text Link opens an individually addressed message; you tap Send in Messages.</p>'+data.members.map(m=>'<label>'+safe(m.name)+'</label><div style="display:flex;gap:8px"><input type="tel" inputmode="tel" placeholder="10-digit phone number" data-phone="'+safe(m.id)+'" value="'+safe(phones[m.id]||'')+'"><button class="secondary" data-save-phone="'+safe(m.id)+'">Save</button></div>').join('');root.appendChild(panel);panel.querySelectorAll('[data-save-phone]').forEach(b=>b.onclick=async()=>{const id=b.dataset.savePhone,number=panel.querySelectorAll('[data-phone]');const input=Array.from(number).find(el=>el.dataset.phone===id);b.disabled=true;try{await rpc('gd_phone_save',{p_member_id:id,p_phone:input.value},true);phones=await rpc('gd_phone_list',{},true);toast('Phone number saved')}catch(err){toast(err.message)}finally{b.disabled=false}});}
function linkButtons(result){if(!result||!createdLinks.length)return;result.innerHTML='<h3>Manager links — send or copy now</h3><p class="note">Each link is private. Saved numbers are pre-addressed in Messages; tap Send to deliver each separate text. Keep this page open until you finish sharing.</p>'+createdLinks.map((l,i)=>'<div class="item"><b>'+safe(l.name)+'</b> '+(phones[l.id]?'('+safe(phones[l.id])+')':'(no saved number)')+'<br><button class="secondary" data-text-link="'+i+'">Text link</button> <button class="secondary" data-copy-link="'+i+'">Copy link</button></div>').join('')+'<button id="privCopyAll" class="secondary full">Copy all links</button>';result.querySelectorAll('[data-text-link]').forEach(b=>b.onclick=()=>{const l=createdLinks[Number(b.dataset.textLink)];smsLink(l);});result.querySelectorAll('[data-copy-link]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(createdLinks[Number(b.dataset.copyLink)].url).then(()=>toast('Link copied')).catch(()=>toast('Copy unavailable in this browser')));result.querySelector('#privCopyAll').onclick=()=>navigator.clipboard.writeText(createdLinks.map(l=>l.name+': '+l.url).join('\n')).then(()=>toast('All links copied')).catch(()=>toast('Copy unavailable in this browser'));}
async function rpc(name,params={},admin=false){
 const response=await api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(params)},admin);
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw Error(payload?.message||payload?.error||'Request failed');
 return payload;
}
async function refreshPrivate(){
 try{weeks=await rpc('gd_public_weeks');if(editing&&session)adminWeeks=await rpc('gd_admin_status',{},true);else adminWeeks=[];if(editing&&session){testWeeks=await rpc('gd_test_status',{},true);phones=await rpc('gd_phone_list',{},true)}else testWeeks=[];if(chosen==='e5'&&tab==='events')render();}
 catch(err){console.warn('Private GameDay refresh:',err.message);}
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
 root.innerHTML='<h2>🔒 Private GameDay picks</h2><p class="note">Manager choices remain hidden from everyone except the commissioner until kickoff. Submissions lock automatically at kickoff.</p>'+
 weeks.map(w=>{
 const locked=now>=Date.parse(w.kickoff),status=adminWeeks.find(a=>a.week===w.week);
 return '<div class="item"><b>Week '+safe(w.week)+': '+safe(w.away)+' vs '+safe(w.home)+'</b><p class="note">Kickoff: '+safe(new Date(w.kickoff).toLocaleString())+' · '+(locked?'Locked — picks revealed':'Picks hidden until kickoff')+'</p>'+
 (locked?data.members.map(m=>'<div class="mini">'+safe(m.name)+': '+safe(w.picks?.[m.id]||'No pick')+'</div>').join(''):'<p class="note">Other managers cannot see selections yet.</p>')+
 (editing&&status?'<details open><summary><b>Commissioner pick tracker — Week '+safe(w.week)+'</b></summary>'+status.members.map(m=>'<div class="mini">'+safe(m.name)+': '+(m.submitted?'Submitted':'Not submitted')+(m.submitted?' — '+safe(m.pick):'')+'</div>').join('')+'</details>':'')+'</div>';
 }).join('')+
 (editing&&session?'<h3>ESPN College GameDay matchup</h3><p class="note">Check ESPN’s announcement first, then find the confirmed game in its schedule. No invitations are sent automatically.</p><a href="https://espnpressroom.com/" target="_blank" rel="noopener">ESPN announcements ↗</a><label>Game date</label><input id="espnDate" type="date"><button id="espnFind" class="secondary full">Find ESPN matchups</button><div id="espnStatus"></div><h3>Create a private week</h3><p class="note">Choose a future kickoff. Each manager receives a unique link. Copy the links immediately: for security, they are displayed only when created.</p><label>Week number</label><input id="privWeek" type="number" min="1" step="1"><label>Away team</label><input id="privAway"><label>Home team</label><input id="privHome"><label>Kickoff (your local time)</label><input id="privKickoff" type="datetime-local"><button id="privCreate" class="full">Create private manager links</button><div id="privResult"></div><button id="privRefresh" class="secondary full">Refresh submission status</button>':'');
 if(editing&&session){
 phonePanel(root);
 testPanel(root);
 root.querySelector('#espnDate').value=new Date().toISOString().slice(0,10);
 root.querySelector('#espnFind').onclick=()=>espnLookup(root);
 linkButtons(root.querySelector('#privResult'));
 root.querySelector('#privRefresh').onclick=refreshPrivate;
 root.querySelector('#privCreate').onclick=async()=>{
 const week=Number(root.querySelector('#privWeek').value),away=root.querySelector('#privAway').value.trim(),home=root.querySelector('#privHome').value.trim(),raw=root.querySelector('#privKickoff').value;
 const kickoff=new Date(raw);
 if(!Number.isInteger(week)||week<1||!away||!home||away.toLowerCase()===home.toLowerCase()||!raw||!Number.isFinite(kickoff.getTime())||kickoff.getTime()<=Date.now())return toast('Enter a valid week, teams and future kickoff');
 if((data.events.find(e=>e.id==='e5')?.gameday?.games||[]).some(g=>Number(g.week)===week)&&!confirm('This week already has a legacy game. Its public picks are not private. Continue with a separate private week?'))return;
 const btn=root.querySelector('#privCreate');btn.disabled=true;
 try{
 const links=await rpc('gd_create_week',{p_week:week,p_away:away,p_home:home,p_kickoff:kickoff.toISOString(),p_members:data.members.map(m=>({id:m.id,name:m.name}))},true);
 createdLinks=links.map(l=>({id:l.id,name:l.name,week,away,home,url:location.origin+location.pathname+'?gd_token='+encodeURIComponent(l.token)}));
 const result=root.querySelector('#privResult');
 linkButtons(result);
 weeks=await rpc('gd_public_weeks');adminWeeks=await rpc('gd_admin_status',{},true);
 }catch(err){toast(err.message)}finally{btn.disabled=false}
 };
 }
 return root;
}
function testPanel(root){
 const panel=document.createElement('div');panel.className='card';panel.style.marginTop='16px';
 panel.innerHTML='<h2>🧪 Test Mode — not official</h2><p class="note">Test picks never appear in public standings or official GameDay weeks. Create a short test, text yourself a private invitation, then delete it.</p>'+
 testWeeks.map(w=>'<div class="item"><b>Test '+safe(w.week)+': '+safe(w.away)+' vs '+safe(w.home)+'</b><p class="note">Kickoff: '+safe(new Date(w.kickoff).toLocaleString())+' · '+(w.locked?'Locked':'Open')+'</p>'+w.members.map(m=>'<div class="mini">'+safe(m.name)+': '+(m.submitted?(w.locked?safe(m.pick):'Submitted (commissioner can view: '+safe(m.pick)+')'):'Not submitted')+'</div>').join('')+'<button class="danger" data-delete-test="'+w.week+'">Delete this test</button></div>').join('')+
 '<label>Away team</label><input id="testAway" value="Ohio St"><label>Home team</label><input id="testHome" value="Iowa"><label>Test kickoff (local time)</label><input type="datetime-local" id="testKickoff"><button class="secondary full" id="testCreate">Generate test links</button><div id="testLinks"></div>';
 root.appendChild(panel);
 panel.querySelector('#testKickoff').value=new Date(Date.now()+10*60000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 const result=panel.querySelector('#testLinks');
 if(testLinks.length){result.innerHTML='<p class="note">Test links: send only to yourself. These remain in this browser tab until you close it or delete the test.</p>'+testLinks.map((l,i)=>'<div class="item"><b>'+safe(l.name)+'</b><br><button class="secondary" data-test-text="'+i+'">Text test link</button> <button class="secondary" data-test-copy="'+i+'">Copy test link</button></div>').join('');result.querySelectorAll('[data-test-text]').forEach(b=>b.onclick=()=>{smsLink(testLinks[Number(b.dataset.testText)]);});result.querySelectorAll('[data-test-copy]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(testLinks[Number(b.dataset.testCopy)].url).then(()=>toast('Test link copied')).catch(()=>toast('Copy unavailable')));}
 panel.querySelector('#testCreate').onclick=async()=>{const away=panel.querySelector('#testAway').value.trim(),home=panel.querySelector('#testHome').value.trim(),kickoff=new Date(panel.querySelector('#testKickoff').value),btn=panel.querySelector('#testCreate');if(!away||!home||away.toLowerCase()===home.toLowerCase()||!Number.isFinite(kickoff.getTime())||kickoff.getTime()<=Date.now())return toast('Enter two teams and a future kickoff');btn.disabled=true;try{const response=await rpc('gd_create_test',{p_away:away,p_home:home,p_kickoff:kickoff.toISOString(),p_members:data.members.map(m=>({id:m.id,name:m.name}))},true);testLinks=response.links.map(l=>({id:l.id,name:l.name,week:'TEST',away,home,url:location.origin+location.pathname+'?gd_token='+encodeURIComponent(l.token)}));sessionStorage.setItem('kingcup_gd_test_links',JSON.stringify(testLinks));testWeeks=await rpc('gd_test_status',{},true);render();toast('Test created — text yourself a link')}catch(err){toast(err.message)}finally{btn.disabled=false}};
 panel.querySelectorAll('[data-delete-test]').forEach(b=>b.onclick=async()=>{if(!confirm('Permanently delete this test and all its test picks?'))return;try{await rpc('gd_delete_test',{p_week:Number(b.dataset.deleteTest)},true);testWeeks=await rpc('gd_test_status',{},true);testLinks=[];sessionStorage.removeItem('kingcup_gd_test_links');render();toast('Test deleted')}catch(err){toast(err.message)}});
}
const original=gameDayDetail;
gameDayDetail=function(e){original(e);const detail=$('eventDetail');if(detail)detail.appendChild(privatePanel())};
async function invitePage(){
 document.body.innerHTML='<main style="max-width:600px;margin:32px auto;padding:18px;font:16px system-ui"><h1>🏈 KingCup GameDay</h1><div id="invContent">Loading private invitation…</div></main>';
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
window.gdRefreshPrivate=refreshPrivate;if(token)invitePage();else{refreshPrivate();setInterval(refreshPrivate,60000);}
})();