/* KingCup GameDay: score locked private picks after final whistle. */
(()=>{
if(new URLSearchParams(location.search).has('gd_token'))return;
const previous=gameDayDetail;
const autoChecked=new Set();
gameDayDetail=function(e){
 previous(e);
 if(e.id!=='e5'||!editing||!session)return;
 const host=document.getElementById('privateGameDay');
 if(!host)return;
 const box=document.createElement('details');
 box.className='item';
 box.innerHTML='<summary style="cursor:pointer;font-weight:700">🏆 Record GameDay winners & score picks</summary><p class="note">ESPN final scores are checked for the latest completed week. Review the suggested winner and tap Save to approve the official score. Older weeks can be checked manually.</p><div id="gdScoreRows">Loading weeks…</div>';
 host.appendChild(box);
 const rows=box.querySelector('#gdScoreRows');
 api('/rest/v1/rpc/gd_history_weeks',{method:'POST',body:'{}'}).then(async r=>{
 if(!r.ok)throw Error('Unable to load private weeks');
 const weeks=await r.json();
 const eligible=weeks.filter(w=>Date.now()>=Date.parse(w.kickoff));
 const latestLockedWeek=Math.max(0,...eligible.map(w=>Number(w.week)));
 if(!eligible.length){rows.textContent='No locked weeks yet.';return}
 rows.innerHTML='';
 for(const w of eligible){
 const pickNo=Number(w.pick_no||1);const old=(e.gameday?.games||[]).find(g=>Number(g.week)===Number(w.week)&&Number(g.pick_no||1)===pickNo);
 const row=document.createElement('div');row.className='item';
 const label=document.createElement('b');label.textContent='Week '+w.week+(pickNo>1?' — Pick '+pickNo:'')+': '+w.away+' vs '+w.home;row.appendChild(label);
 const select=document.createElement('select');
 for(const name of ['',w.away,w.home]){const opt=document.createElement('option');opt.value=name;opt.textContent=name||'Select winning team';select.appendChild(opt)}
 select.value=old?.winner||'';row.appendChild(select);
 const espnButton=document.createElement('button');espnButton.className='secondary full';espnButton.textContent='Check ESPN final score';row.appendChild(espnButton);
 const espnStatus=document.createElement('p');espnStatus.className='note';row.appendChild(espnStatus);
 espnButton.onclick=async()=>{
  espnButton.disabled=true;espnStatus.textContent='Checking ESPN final results…';
  try{
   const day=Date.parse(w.kickoff),dates=[-86400000,0,86400000].map(offset=>new Date(day+offset).toISOString().slice(0,10).replace(/-/g,''));
   const all=[];
   for(const date of dates){
    const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=200&dates='+date);
    if(!response.ok)continue;
    const j=await response.json();
    all.push(...(j.events||[]));
   }
   const normalize=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
   const matched=all.find(event=>{
    const teams=(event.competitions?.[0]?.competitors||[]).map(c=>normalize(c.team?.displayName));
    return teams.length===2&&teams.includes(normalize(w.away))&&teams.includes(normalize(w.home));
   });
   if(!matched){espnStatus.textContent='Matchup not found on ESPN. Select the winner manually.';return}
   if(!matched.status?.type?.completed){espnStatus.textContent='ESPN has not marked this game final. Do not record a winner yet.';return}
   const competitors=matched.competitions?.[0]?.competitors||[];
   const winner=competitors.find(c=>c.winner);
   if(!winner){espnStatus.textContent='ESPN does not identify a winner. Select manually.';return}
   const choice=[w.away,w.home].find(name=>normalize(name)===normalize(winner.team?.displayName));
   if(!choice){espnStatus.textContent='Team name mismatch. Select manually.';return}
   select.value=choice;
   espnStatus.textContent='ESPN final: '+competitors.map(c=>c.team?.displayName+' '+(c.score||'?')).join(' — ')+'. Winner selected. Review and tap Save winner to make official.';
  }catch(err){espnStatus.textContent='ESPN unavailable: '+err.message+'. Choose the winner manually.'}
  finally{espnButton.disabled=false}
 };
 const button=document.createElement('button');button.className='secondary full';button.textContent='Save winner & score all picks';row.appendChild(button);
 button.onclick=async()=>{
 if(![w.away,w.home].includes(select.value))return toast('Select the winning team');
 if(old?.winner&&old.winner!==select.value&&!confirm('Change the previously recorded winner for Week '+w.week+'?'))return;
 if(old&&(old.away!==w.away||old.home!==w.home)&&!confirm('Replace the existing Week '+w.week+' matchup and picks?'))return;
 const picks={};for(const m of data.members){const p=w.picks?.[m.id];if(p===w.away||p===w.home)picks[m.id]=p}
 if(Object.keys(picks).length===0&&!confirm('No locked picks found. Continue anyway?'))return;
 const games=e.gameday?.games||[];const i=games.findIndex(g=>Number(g.week)===Number(w.week)&&Number(g.pick_no||1)===pickNo);
 const record={week:Number(w.week),pick_no:pickNo,away:w.away,home:w.home,winner:select.value,picks};
 if(!e.gameday)e.gameday={games:[]};
 if(i<0)e.gameday.games.push(record);else e.gameday.games[i]=record;
 e.gameday.games.sort((a,b)=>Number(a.week)-Number(b.week));e.status='Live';
 button.disabled=true;await save();
 };
 rows.appendChild(row);
 const lookupKey=w.week+':'+pickNo;
 if(!old?.winner&&Number(w.week)===latestLockedWeek&&!autoChecked.has(lookupKey)){
  autoChecked.add(lookupKey);
  espnButton.click();
 }
 }
 }).catch(err=>{rows.textContent=err.message});
};
})();