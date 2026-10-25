/* Private World Series predictions for KingCup Champion of Champions. */
(()=>{
const params=new URLSearchParams(location.search),token=params.get('cc_token');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
let links=[],phones={};
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
   area.innerHTML='<h2>'+safe(v.name)+'</h2><p>Choose the series champion, final-game score and total number of series games.</p><p><b>'+safe(v.team_a)+' vs '+safe(v.team_b)+'</b></p><p>Picks lock: '+safe(new Date(v.deadline).toLocaleString())+'</p><p>'+(!locked?'Your selection stays private until picks lock. You can update your answer using this same link before the deadline.':'Picks are locked.')+'</p><p>Saved pick: <b>'+safe(v.winner?(v.winner+' · final game '+v.final_winner_runs+'–'+v.final_loser_runs+' · '+v.series_games+' games'):'None yet')+'</b></p>'+(!locked?'<label for="ccWinner">Series champion</label><select id="ccWinner" style="display:block;width:100%;padding:12px;margin:8px 0"><option value="">Select a winner</option><option value="'+safe(v.team_a)+'" '+(v.winner===v.team_a?'selected':'')+'>'+safe(v.team_a)+'</option><option value="'+safe(v.team_b)+'" '+(v.winner===v.team_b?'selected':'')+'>'+safe(v.team_b)+'</option></select><label>Predicted score of the FINAL game (not series score)</label><label for="ccRunsA">Series winner — final-game runs</label><input id="ccRunsA" type="number" min="1" max="100" inputmode="numeric" style="display:block;width:100%;padding:12px;margin:8px 0" value="'+safe(v.final_winner_runs??'')+'"><label for="ccRunsB">Opponent — final-game runs</label><input id="ccRunsB" type="number" min="0" max="100" inputmode="numeric" style="display:block;width:100%;padding:12px;margin:8px 0" value="'+safe(v.final_loser_runs??'')+'"><label for="ccGames">Total games in World Series</label><select id="ccGames" style="display:block;width:100%;padding:12px;margin:8px 0"><option value="">Select games</option>'+[4,5,6,7].map(n=>'<option value="'+n+'" '+(v.series_games===n?'selected':'')+'>'+n+' games</option>').join('')+'</select><p style="font-size:13px">Example: Yankees win in 6 games, with a 5–3 score in the final game.</p><button id="ccSubmit" style="padding:13px 25px">Save my World Series pick</button><p id="ccMessage" role="status"></p>':'')+(message?'<p style="color:#81d9a1;font-weight:700">✓ '+safe(message)+'</p>':'');
   if(!locked)document.getElementById('ccSubmit').onclick=async()=>{
    const winner=document.getElementById('ccWinner').value,n=document.getElementById('ccGames').value,ra=document.getElementById('ccRunsA').value,rb=document.getElementById('ccRunsB').value;
    if(!winner||n===''||ra===''||rb===''||!Number.isInteger(Number(ra))||!Number.isInteger(Number(rb))||Number(ra)<=Number(rb)||Number(rb)<0||Number(ra)>100)return document.getElementById('ccMessage').textContent='Choose a winner, enter a winning final-game score, and select total series games.';
    const b=document.getElementById('ccSubmit');b.disabled=true;
    try{await call('cc_world_series_submit',{p_token:token,p_winner:winner,p_winner_runs:Number(ra),p_loser_runs:Number(rb),p_series_games:Number(n)});await load('Your pick was saved.')}
    catch(e){document.getElementById('ccMessage').textContent=e.message;b.disabled=false}
   };
  }catch(e){area.textContent='Unable to open World Series invitation: '+e.message}
 }
 await load();
}
async function panel(){
 const root=document.createElement('section');root.className='card';
 root.innerHTML='<h2>🔒 World Series private predictions</h2><p class="note">Send each manager a private link to choose the series champion, final-game score, and total series games (4–7). Predictions are hidden until the deadline, and can be changed before it.</p><div id="ccAdmin">Loading…</div>';
 const host=document.getElementById('eventDetail');if(!host)return;host.appendChild(root);
 const area=root.querySelector('#ccAdmin');
 try{
  const status=await call('cc_world_series_status',{},true);
  try{phones=await call('gd_phone_list',{},true)||{}}catch(err){console.warn('Could not load saved GameDay manager phone numbers:',err.message)}
  if(!status){
   area.innerHTML='<h3>Choose the next World Series game from ESPN</h3><label>MLB game date</label><input id="ccEspnDate" type="date"><button id="ccEspnFind" class="secondary full">Find ESPN baseball games</button><div id="ccEspnResults" class="item"><p class="note">Choose the next World Series game to automatically enter the two teams and set the deadline 5 minutes before first pitch. You can adjust the deadline below.</p></div><label>First World Series team</label><input id="ccTeamA" placeholder="Team A"><label>Second World Series team</label><input id="ccTeamB" placeholder="Team B"><label>Pick deadline (local time, before the next game)</label><input id="ccDeadline" type="datetime-local"><p class="note">The deadline locks all managers’ picks. Each manager can save or change their prediction before it, but not afterward. Creating links does not send messages automatically.</p><button id="ccCreate" class="full">Create private World Series links</button><p id="ccNotice" role="status"></p>';
   const today=new Date();const tomorrow=new Date(today);tomorrow.setDate(today.getDate()+1);area.querySelector('#ccEspnDate').value=tomorrow.getFullYear()+'-'+String(tomorrow.getMonth()+1).padStart(2,'0')+'-'+String(tomorrow.getDate()).padStart(2,'0');
   area.querySelector('#ccEspnFind').onclick=async()=>{
    const status=area.querySelector('#ccEspnResults'),date=area.querySelector('#ccEspnDate').value;
    if(!date)return status.textContent='Select a game date.';
    status.textContent='Loading ESPN baseball schedule…';
    try{
     const resp=await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates='+date.replace(/-/g,'')+'&limit=100');
     if(!resp.ok)throw Error('ESPN is unavailable.');
     const json=await resp.json();
     const events=(json.events||[]).map(event=>{
      const game=event.competitions?.[0];const opponents=game?.competitors||[];
      const a=opponents.find(x=>x.homeAway==='away'),h=opponents.find(x=>x.homeAway==='home');
      return {away:a?.team?.displayName,home:h?.team?.displayName,kickoff:event.date,name:event.name,completed:event.status?.type?.completed,notes:game?.notes?.map(n=>n.headline).join(' ')||''};
     }).filter(x=>x.away&&x.home&&x.kickoff&&!x.completed);
     if(!events.length){status.innerHTML='<p class="note">No upcoming games were returned for this date. Try another date or enter teams and deadline manually.</p>';return}
     status.innerHTML='<p class="note">Choose the confirmed next World Series matchup. ESPN may also include other MLB games.</p><select id="ccEspnGame"><option value="">Choose a baseball game</option>'+events.map((x,i)=>'<option value="'+i+'">'+safe(x.away)+' at '+safe(x.home)+' — '+safe(new Date(x.kickoff).toLocaleString())+'</option>').join('')+'</select><button id="ccEspnUse" class="secondary full">Use this matchup and deadline</button><p id="ccEspnChosen" class="note"></p>';
     status.querySelector('#ccEspnUse').onclick=()=>{
      const selected=status.querySelector('#ccEspnGame').value;
      if(selected==='')return toast('Choose a game first');
      const game=events[Number(selected)],start=new Date(game.kickoff),deadline=new Date(start.getTime()-5*60000);
      if(deadline<=new Date())return toast('This game is too close to first pitch. Select a future game.');
      area.querySelector('#ccTeamA').value=game.away;
      area.querySelector('#ccTeamB').value=game.home;
      area.querySelector('#ccDeadline').value=new Date(deadline.getTime()-deadline.getTimezoneOffset()*60000).toISOString().slice(0,16);
      status.querySelector('#ccEspnChosen').textContent='Selected '+game.away+' vs '+game.home+'. Picks lock '+deadline.toLocaleString()+' (5 minutes before first pitch).';
      toast('Matchup and pick deadline set');
     };
    }catch(err){status.textContent='Could not load ESPN baseball games: '+err.message+'. Enter both teams and the deadline manually.'}
   };
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
   area.innerHTML='<p><b>'+safe(status.team_a)+' vs '+safe(status.team_b)+'</b></p><p class="note">Pick deadline: '+safe(new Date(status.deadline).toLocaleString())+' — '+(locked?'LOCKED':'OPEN')+'</p><button id="ccRefreshPicks" class="secondary full">Refresh manager picks</button><p class="note">Commissioner only: submitted predictions are visible here immediately. Other managers cannot see them before the deadline.</p><h3>Manager submissions</h3>'+status.members.map(m=>'<div class="item"><b>'+safe(m.name)+'</b>: '+(m.submitted?'Submitted':'Not submitted')+(m.submitted&&m.winner?' — '+safe(m.winner)+' · final game '+safe(m.final_winner_runs)+'–'+safe(m.final_loser_runs)+' · '+safe(m.series_games)+' games'+(m.submitted_at?' · submitted '+safe(new Date(m.submitted_at).toLocaleString()):''):'')+(!locked?' <button class="secondary" data-cc-resend="'+safe(m.id)+'">Generate new link</button>':'')+'</div>').join('')+'<div id="ccLinks"></div><details class="item" id="ccPhones"><summary style="cursor:pointer;font-weight:700">Manager phone numbers ▾</summary><p class="note">These are the same saved phone numbers used for GameDay. Any changes here also update GameDay.</p>'+data.members.map(m=>'<label>'+safe(m.name)+'</label><div style="display:flex;gap:8px"><input type="tel" inputmode="tel" placeholder="10-digit phone number" data-cc-phone="'+safe(m.id)+'" value="'+safe(phones[m.id]||'')+'"><button class="secondary" data-cc-save-phone="'+safe(m.id)+'">Save</button></div>').join('')+'</details>'+(locked?'<button id="ccImport" class="full">Transfer locked picks to Champions scoring</button><p class="note">This records predictions only. After the series ends, enter the actual champion and result in Edit picks & result.</p>':'<p class="note">Once the deadline passes, transfer locked predictions into the Champions standings.</p>')+'<p id="ccNotice" role="status"></p>';
   area.querySelector('#ccRefreshPicks').onclick=async()=>{await panel();root.remove()};
   const linkBox=area.querySelector('#ccLinks');
   function displayLinks(){
    linkBox.innerHTML=links.length?'<h3>Private links — send to each manager</h3><p class="note">Use each manager’s own link. Creating a new link invalidates their previous link, but preserves their submitted pick.</p>'+links.map((l,i)=>'<div class="item"><b>'+safe(l.name)+'</b> '+(phones[l.id]?'('+safe(phones[l.id])+')':'(no saved phone number)')+'<br><button class="secondary" data-cc-copy="'+i+'">Copy link</button> <button class="secondary" data-cc-text="'+i+'">Text link</button></div>').join('')+'<button class="secondary full" id="ccCopyAll">Copy all manager links</button>':'';
    linkBox.querySelectorAll('[data-cc-copy]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(links[Number(b.dataset.ccCopy)].url).then(()=>toast('Link copied')).catch(()=>toast('Unable to copy')));
    linkBox.querySelectorAll('[data-cc-text]').forEach(b=>b.onclick=()=>{const l=links[Number(b.dataset.ccText)],number=String(phones[l.id]||'').replace(/[^0-9+]/g,'');if(!number)return toast('No saved number for '+l.name+'. Add it under Manager phone numbers.');location.href='sms:'+number+'&body='+encodeURIComponent('🏆 KingCup World Series pick\n'+l.name+', choose the series winner, final-game score and number of games:\n'+l.url)});
    const all=linkBox.querySelector('#ccCopyAll');if(all)all.onclick=()=>navigator.clipboard.writeText(links.map(l=>l.name+': '+l.url).join('\n')).then(()=>toast('All links copied'));
   }
   displayLinks();
   area.querySelectorAll('[data-cc-save-phone]').forEach(b=>b.onclick=async()=>{const id=b.dataset.ccSavePhone,input=Array.from(area.querySelectorAll('[data-cc-phone]')).find(el=>el.dataset.ccPhone===id);if(!input)return;b.disabled=true;try{await call('gd_phone_save',{p_member_id:id,p_phone:input.value},true);phones=await call('gd_phone_list',{},true);displayLinks();toast('Phone number saved for GameDay and World Series')}catch(err){toast('Could not save phone: '+err.message)}finally{b.disabled=false}});
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
    const picks={};for(const m of status.members){if(m.winner&&Number.isInteger(m.final_winner_runs)&&Number.isInteger(m.final_loser_runs)&&m.series_games>=4&&m.series_games<=7)picks[m.id]={team:m.winner,score:{a:m.final_winner_runs,b:m.final_loser_runs},seriesGames:m.series_games}}
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