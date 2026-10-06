/* KingCup GameDay: score locked private picks after final whistle. */
(()=>{
if(new URLSearchParams(location.search).has('gd_token'))return;
const previous=gameDayDetail;
gameDayDetail=function(e){
 previous(e);
 if(e.id!=='e5'||!editing||!session)return;
 const host=document.getElementById('privateGameDay');
 if(!host)return;
 const box=document.createElement('details');
 box.className='item';
 box.innerHTML='<summary style="cursor:pointer;font-weight:700">🏆 Record GameDay winners & score picks</summary><p class="note">After kickoff, select the winner. Locked private picks transfer to the official standings automatically.</p><div id="gdScoreRows">Loading weeks…</div>';
 host.appendChild(box);
 const rows=box.querySelector('#gdScoreRows');
 api('/rest/v1/rpc/gd_public_weeks',{method:'POST',body:'{}'}).then(async r=>{
 if(!r.ok)throw Error('Unable to load private weeks');
 const weeks=await r.json();
 const eligible=weeks.filter(w=>Date.now()>=Date.parse(w.kickoff));
 if(!eligible.length){rows.textContent='No locked weeks yet.';return}
 rows.innerHTML='';
 for(const w of eligible){
 const pickNo=Number(w.pick_no||1);const old=(e.gameday?.games||[]).find(g=>Number(g.week)===Number(w.week)&&Number(g.pick_no||1)===pickNo);
 const row=document.createElement('div');row.className='item';
 const label=document.createElement('b');label.textContent='Week '+w.week+(pickNo>1?' — Pick '+pickNo:'')+': '+w.away+' vs '+w.home;row.appendChild(label);
 const select=document.createElement('select');
 for(const name of ['',w.away,w.home]){const opt=document.createElement('option');opt.value=name;opt.textContent=name||'Select winning team';select.appendChild(opt)}
 select.value=old?.winner||'';row.appendChild(select);
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
 }
 }).catch(err=>{rows.textContent=err.message});
};
})();