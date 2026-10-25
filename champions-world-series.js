/* Private World Series predictions for KingCup Champion of Champions. */
(()=>{
const params=new URLSearchParams(location.search),token=params.get('cc_token');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
let links=[];
try{links=JSON.parse(sessionStorage.getItem('kingcup_cc_links')||'[]')}catch{}
async function call(name,args={},admin=false){
 const r=await api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(args)},admin);
 const v=await r.json().catch(()=>null);
 if(!r.ok)throw Error(v?.message||v?.error||'Unable to complete request');
 return v;
}
function linkFor(t){return location.origin+location.pathname+'?cc_token='+encodeURIComponent(t)}
async function invitation(){
 document.body.innerHTML='<main style="max-width:620px;margin:25px auto;padding:20px;font:16px system-ui"><h1>🏆 KingCup World Series</h1><div id="ccInvite">Loading…</div></main>';
 const area=document.getElementById('ccInvite');
 async function load(message){
  try{
   const v=await call('cc_world_series_invitation',{p_token:token});
   const locked=v.locked||Date.now()>=Date.parse(v.deadline);
   area.innerHTML='<h2>'+safe(v.name)+'</h2><p>Choose the World Series champion and the final series result.</p><p><b>'+safe(v.team_a)+' vs '+safe(v.team_b)+'</b></p><p>Picks lock: '+safe(new Date(v.deadline).toLocaleString())+'</p><p>'+(!locked?'Your selection stays private until picks lock. You can update your answer using this same link before the deadline.':'Picks are locked.')+'</p><p>Saved pick: <b>'+safe(v.winner?(v.winner+' wins 4–'+v.loser_games):'None yet')+'</b></p>'+(!locked?'<label for="ccWinner">Series champion</label><select id="ccWinner" style="display:block;width:100%;padding:12px;margin:8px 0"><option value="">Select a winner</option><option value="'+safe(v.team_a)+'" '+(v.winner===v.team_a?'selected':'')+'>'+safe(v.team_a)+'</option><option value="'+safe(v.team_b)+'" '+(v.winner===v.team_b?'selected':'')+'>'+safe(v.team_b)+'</option></select><label for="ccGames">Series final score</label><select id="ccGames" style="display:block;width:100%;padding:12px;margin:8px 0"><option value="">Select final result</option>'+[0,1,2,3].map(n=>'<option value="'+n+'" '+(v.winner&&v.loser_games===n?'selected':'')+'>4–'+n+'</option>').join('')+'</select><p style="font-size:13px">Example: Dodgers 4–2 means the Dodgers win four games and their opponent wins two.</p><button id="ccSubmit" style="padding:13px 25px">Save my World Series pick</button><p id="ccMessage" role="status"></p>':'')+(message?'<p style="color:#81d9a1;font-weight:700">✓ '+safe(message)+'</p>':'');
   if(!locked)document.getElementById('ccSubmit').onclick=async()=>{
    const winner=document.getElementById('ccWinner').value,n=document.getElementById('ccGames').value;
    if(!winner||n==='')return document.getElementById('ccMessage').textContent='Choose both a winner and a final score.';
    const b=document.getElementById('ccSubmit');b.disabled=true;
    try{await call('cc_world_series_submit',{p_token:token,p_winner:winner,p_loser_games:Number(n)});await load('Your pick was saved.')}
    catch(e){document.getElementById('ccMessage').textContent=e.message;b.disabled=false}
   };
  }catch(e){area.textContent='Unable to open World Series invitation: '+e.message}
 }
 await load();
}
async function panel(){
 const root=document.createElement('section');root.className='card';
 root.innerHTML='<h2>🔒 World Series private predictions</h2><p class="note">Send each manager a private link to choose the champion and series result (4–0, 4–1, 4–2, or 4–3). Predictions are hidden until the deadline, and can be changed before it.</p><div id="ccAdmin">Loading…</div>';
 const host=document.getElementById('eventDetail');if(!host)return;host.appendChild(root);
 const area=root.querySelector('#ccAdmin');
 try{
  const status=await call('cc_world_series_status',{},true);
  if(!status){
   area.innerHTML='<label>First World Series team</label><input id="ccTeamA" placeholder="Team A"><label>Second World Series team</label><input id="ccTeamB" placeholder="Team B"><label>Deadline to submit picks (local time)</label><input id="ccDeadline" type="datetime-local"><p class="note">Set a future deadline. Ideally, picks close before the next World Series game begins. Creating links does not send messages automatically.</p><button id="ccCreate" class="full">Create private World Series links</button><p id="ccNotice" role="status"></p>';
   root.querySelector('#ccCreate').onclick=async()=>{
    const a=root.querySelector('#ccTeamA').value.trim(),b=root.querySelector('#ccTeamB').value.trim(),raw=root.querySelector('#ccDeadline').value;
    const d=new Date(raw);
    if(!a||!b||a.toLowerCase()===b.toLowerCase()||!raw||d<=new Date())return root.querySelector('#ccNotice').textContent='Enter both teams and a future deadline.';
    if(!confirm('Create World Series pick links for all '+data.members.length+' managers? Team names and deadline cannot be changed from this page afterward.'))return;
    const button=root.querySelector('#ccCreate');button.disabled=true;
    try{
     const res=await call('cc_create_world_series',{p_team_a:a,p_team_b:b,p_deadline:d.toISOString(),p_members:data.members.map(m=>({id:m.id,name:m.name}))},true);
     links=res.map(x=>({id:x.id,name:x.name,url:linkFor(x.token)}));
     sessionStorage.setItem('kingcup_cc_links',JSON.stringify(links));
     await panel();root.remove();toast('World Series links created — copy and send them now');
    }catch(e){root.querySelector('#ccNotice').textContent=e.message;button.disabled=false}
   };
  }else{
   const locked=status.locked||Date.now()>=Date.parse(status.deadline);
   area.innerHTML='<p><b>'+safe(status.team_a)+' vs '+safe(status.team_b)+'</b></p><p class="note">Pick deadline: '+safe(new Date(status.deadline).toLocaleString())+' — '+(locked?'LOCKED':'OPEN')+'</p><h3>Manager submissions</h3>'+status.members.map(m=>'<div class="item"><b>'+safe(m.name)+'</b>: '+(m.submitted?'Submitted':'Not submitted')+(locked&&m.winner?' — '+safe(m.winner)+' 4–'+safe(m.loser_games):'')+(!locked?' <button class="secondary" data-cc-resend="'+safe(m.id)+'">Generate new link</button>':'')+'</div>').join('')+'<div id="ccLinks"></div>'+(locked?'<button id="ccImport" class="full">Transfer locked picks to Champions scoring</button><p class="note">This records predictions only. After the series ends, enter the actual champion and result in Edit picks & result.</p>':'<p class="note">Once the deadline passes, transfer locked predictions into the Champions standings.</p>')+'<p id="ccNotice" role="status"></p>';
   const linkBox=area.querySelector('#ccLinks');
   function displayLinks(){
    linkBox.innerHTML=links.length?'<h3>Private links — send to each manager</h3><p class="note">Use each manager’s own link. Creating a new link invalidates their previous link, but preserves their submitted pick.</p>'+links.map((l,i)=>'<div class="item"><b>'+safe(l.name)+'</b><br><button class="secondary" data-cc-copy="'+i+'">Copy link</button> <button class="secondary" data-cc-text="'+i+'">Text link</button></div>').join('')+'<button class="secondary full" id="ccCopyAll">Copy all manager links</button>':'';
    linkBox.querySelectorAll('[data-cc-copy]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(links[Number(b.dataset.ccCopy)].url).then(()=>toast('Link copied')).catch(()=>toast('Unable to copy')));
    linkBox.querySelectorAll('[data-cc-text]').forEach(b=>b.onclick=()=>{const l=links[Number(b.dataset.ccText)];location.href='sms:&body='+encodeURIComponent('🏆 KingCup World Series pick\n'+l.name+', choose the winner and series score:\n'+l.url)});
    const all=linkBox.querySelector('#ccCopyAll');if(all)all.onclick=()=>navigator.clipboard.writeText(links.map(l=>l.name+': '+l.url).join('\n')).then(()=>toast('All links copied'));
   }
   displayLinks();
   area.querySelectorAll('[data-cc-resend]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Generate a new link? The old link will stop working; saved picks will remain.'))return;
    b.disabled=true;
    try{
     const id=b.dataset.ccResend,v=await call('cc_world_series_resend',{p_member_id:id},true);
     const l={id,name:v.name,url:linkFor(v.token)};links=links.filter(x=>x.id!==id).concat(l);
     sessionStorage.setItem('kingcup_cc_links',JSON.stringify(links));displayLinks();toast('New private link generated');
    }catch(e){area.querySelector('#ccNotice').textContent=e.message}finally{b.disabled=false}
   });
   if(locked)area.querySelector('#ccImport').onclick=async()=>{
    const e=data.events.find(x=>x.id==='e3');if(!e)return;
    const previous=e.champions?.mlb||{};
    if(Object.keys(previous.picks||{}).length&&!confirm('Replace the current World Series predictions in Champions scoring with locked private submissions?'))return;
    const picks={};for(const m of status.members){if(m.winner&&m.winner_games===4&&m.loser_games>=0&&m.loser_games<=3)picks[m.id]={team:m.winner,score:{a:4,b:m.loser_games}}}
    e.champions=e.champions||{};e.champions.mlb={...previous,picks};
    if(e.status==='Upcoming')e.status='Live';
    await save();toast('Private World Series predictions transferred into Champions scoring');
   };
  }
 }catch(e){area.textContent='Unable to load private World Series picks: '+e.message}
}
if(token){invitation();return}
const previous=championsDetail;
championsDetail=function(e){previous(e);if(editing&&session)panel()};
})();