/* Private GameDay submissions: no private selections enter league_state. */
(()=>{
const token=new URLSearchParams(location.search).get('gd_token');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let weeks=[],adminWeeks=[],createdLinks=[];
function linkMessage(l){return 'KingCup GameDay: '+l.name+', make your private Week '+l.week+' pick ('+l.away+' vs '+l.home+') before kickoff. Your personal link: '+l.url+' — Please do not forward this link.';}
function linkButtons(result){if(!result||!createdLinks.length)return;result.innerHTML='<h3>Manager links — send or copy now</h3><p class="note">Each link is private. Sending opens your Messages app; you choose the recipient and tap Send. Keep this page open until you finish sharing.</p>'+createdLinks.map((l,i)=>'<div class="item"><b>'+safe(l.name)+'</b><br><button class="secondary" data-text-link="'+i+'">Text link</button> <button class="secondary" data-copy-link="'+i+'">Copy link</button></div>').join('')+'<button id="privCopyAll" class="secondary full">Copy all links</button>';result.querySelectorAll('[data-text-link]').forEach(b=>b.onclick=()=>{const l=createdLinks[Number(b.dataset.textLink)];location.href='sms:&body='+encodeURIComponent(linkMessage(l));});result.querySelectorAll('[data-copy-link]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(createdLinks[Number(b.dataset.copyLink)].url).then(()=>toast('Link copied')).catch(()=>toast('Copy unavailable in this browser')));result.querySelector('#privCopyAll').onclick=()=>navigator.clipboard.writeText(createdLinks.map(l=>l.name+': '+l.url).join('\n')).then(()=>toast('All links copied')).catch(()=>toast('Copy unavailable in this browser'));}
async function rpc(name,params={},admin=false){
 const response=await api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(params)},admin);
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw Error(payload?.message||payload?.error||'Request failed');
 return payload;
}
async function refreshPrivate(){
 try{weeks=await rpc('gd_public_weeks');if(editing&&session)adminWeeks=await rpc('gd_admin_status',{},true);else adminWeeks=[];if(chosen==='e5'&&tab==='events')render();}
 catch(err){console.warn('Private GameDay refresh:',err.message);}
}
function privatePanel(){
 const root=document.createElement('section');root.className='card';root.id='privateGameDay';
 const now=Date.now();
 root.innerHTML='<h2>🔒 Private GameDay picks</h2><p class="note">Manager choices remain hidden from everyone except the commissioner until kickoff. Submissions lock automatically at kickoff.</p>'+
 weeks.map(w=>{
 const locked=now>=Date.parse(w.kickoff),status=adminWeeks.find(a=>a.week===w.week);
 return '<div class="item"><b>Week '+safe(w.week)+': '+safe(w.away)+' vs '+safe(w.home)+'</b><p class="note">Kickoff: '+safe(new Date(w.kickoff).toLocaleString())+' · '+(locked?'Locked — picks revealed':'Picks hidden until kickoff')+'</p>'+
 (locked?data.members.map(m=>'<div class="mini">'+safe(m.name)+': '+safe(w.picks?.[m.id]||'No pick')+'</div>').join(''):'<p class="note">Other managers cannot see selections yet.</p>')+
 (editing&&status?'<details><summary>Commissioner-only submission status</summary>'+status.members.map(m=>'<div class="mini">'+safe(m.name)+': '+(m.submitted?'Submitted':'Not submitted')+(m.submitted?' — '+safe(m.pick):'')+'</div>').join('')+'</details>':'')+'</div>';
 }).join('')+
 (editing&&session?'<h3>Create a private week</h3><p class="note">Choose a future kickoff. Each manager receives a unique link. Copy the links immediately: for security, they are displayed only when created.</p><label>Week number</label><input id="privWeek" type="number" min="1" step="1"><label>Away team</label><input id="privAway"><label>Home team</label><input id="privHome"><label>Kickoff (your local time)</label><input id="privKickoff" type="datetime-local"><button id="privCreate" class="full">Create private manager links</button><div id="privResult"></div><button id="privRefresh" class="secondary full">Refresh submission status</button>':'');
 if(editing&&session){
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
 createdLinks=links.map(l=>({name:l.name,week,away,home,url:location.origin+location.pathname+'?gd_token='+encodeURIComponent(l.token)}));
 const result=root.querySelector('#privResult');
 linkButtons(result);
 weeks=await rpc('gd_public_weeks');adminWeeks=await rpc('gd_admin_status',{},true);
 }catch(err){toast(err.message)}finally{btn.disabled=false}
 };
 }
 return root;
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
 area.innerHTML='<h2>'+safe(v.name)+'</h2><p>Week '+safe(v.week)+': '+safe(v.away)+' vs '+safe(v.home)+'</p><p>Kickoff: '+safe(new Date(v.kickoff).toLocaleString())+'</p><p><b>'+(locked?'Picks are locked.':'Your pick is private until kickoff.')+'</b></p><p>Saved pick: '+safe(v.pick||'None yet')+'</p>'+(locked?'':'<label for="invPick">Choose your winner</label><select id="invPick" style="display:block;width:100%;padding:12px;margin:10px 0"><option value="">Select a team</option><option value="'+safe(v.away)+'" '+(v.pick===v.away?'selected':'')+'>'+safe(v.away)+'</option><option value="'+safe(v.home)+'" '+(v.pick===v.home?'selected':'')+'>'+safe(v.home)+'</option></select><button id="invSave" style="padding:12px 24px">Save my pick</button><p id="invMessage" role="status"></p>');
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
if(token)invitePage();else{refreshPrivate();setInterval(refreshPrivate,60000);}
})();