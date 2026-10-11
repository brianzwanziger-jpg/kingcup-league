/* Historical KingCup champions, supplied by commissioner. Read-only; does not change season scoring. */
(()=>{
const teams={
 Z:"Ziggies",C:"The Caucasians",B:"B-Rad Ballerz",S:"Show Me Your TD's",T:"Turndog Troubadours",R:"Redbirds",E:"BEASts",I:"In a Pickle Bickell",J:"Satch",P:"Powerhouse Honkey"
};
const people={Z:"Brian Zwanziger",C:"Kevin Jones",B:"Brad Ethridge",S:"Chris Elliot",T:"Matt Turner",R:"Josh Calavan",E:"Geoff Beasley",I:"Joe Bickell",J:"Josh Morris",P:"Nicholas"};
const records={
 e0:[[2016,"S"],[2017,"Z"],[2018,"C"],[2019,"B"],[2020,"C"],[2021,"Z"],[2022,"R"],[2023,"T"],[2024,"S"],[2025,"Z"]],
 e5:[[2017,"S"],[2018,"B"],[2019,"B"],[2020,"C"],[2021,"T"],[2022,"T"],[2023,"S"],[2024,"B"],[2025,"C"]],
 e1:[[2016,"B"],[2017,"Z"],[2018,"B"],[2019,"E"],[2020,"C"],[2021,"T"],[2022,"Z"],[2023,"E"],[2024,"C"],[2025,"Z"]],
 e2:[[2016,"Z"],[2017,"C"],[2018,"B"],[2019,null],[2020,"Z"],[2021,"R"],[2022,"B"],[2023,"I"],[2024,"B"],[2025,"S"]],
 e3:[[2024,"C"],[2025,"J"]],
 e4:[[2017,"Z"],[2018,"B"],[2019,"B"],[2020,"C"],[2021,"T"],[2022,"T"],[2023,"I"],[2024,"T"],[2025,"E"]]
};
const titles={e0:"Fantasy Football",e5:"GameDay Challenge",e1:"Bowl Pick’em",e2:"March Madness",e3:"Champion of Champions",e4:"KingCup Trophy"};
const all=Object.entries(records).flatMap(([event,rs])=>rs.filter(([year,k])=>k).map(([year,k])=>({event,year,key:k})));
const norm=x=>String(x||"").toLowerCase().replace(/[^a-z0-9]/g,"");
function showHistory(){
 const home=document.getElementById('home');
 if(home){
 const members=(Array.isArray(data.members)?data.members:[]).map(m=>{
 const key=Object.keys(teams).find(k=>norm(teams[k])===norm(m.name));
 const won=key?all.filter(x=>x.key===key):[];
 return {m,won};
 }).sort((a,b)=>b.won.length-a.won.length||a.m.name.localeCompare(b.m.name));
 home.innerHTML='<div class="card champ"><h2>🏆 All-Time Trophy Leaders</h2><p class="note">Championships won across all six competitions, ranked by total trophies. Tap any manager to see the trophy years.</p></div><div class="card">'+members.map((x,i)=>{
 const years=Object.keys(titles).map(event=>{const wonYears=x.won.filter(w=>w.event===event).map(w=>w.year).sort((a,b)=>a-b);return '<div style="padding:5px 0"><b>'+esc(titles[event])+'</b>'+(wonYears.length?': '+wonYears.join(', '):'')+'</div>'}).join('');
 return '<div class="item" style="padding:12px 0"><div class="row between"><b>'+(i+1)+'. '+esc(x.m.name)+'</b><b style="color:#f4d381">🏆 '+x.won.length+'</b></div><details class="kc-trophy" style="margin-top:8px"><summary style="cursor:pointer;color:#f4d381;font-weight:700">View trophies ▾</summary><div style="padding:8px 0">'+years+'</div></details></div>';
 }).join('')+'</div>';
 }
 const race=document.getElementById('race');
 if(race&&!race.querySelector('.kc-kingcup-history')){
 const card=document.createElement('div');card.className='card kc-kingcup-history';card.style.marginTop='14px';
 card.innerHTML='<h2>🏆 Past KingCup Winners</h2>'+records.e4.slice().reverse().map(([year,k])=>'<div class="item row between"><b>'+year+'</b><span>'+esc(teams[k])+' — '+esc(people[k])+'</span></div>').join('')+'<p class="note">2016: No champion recorded.</p>';
 race.appendChild(card);
 }
 const detailEl=document.getElementById('eventDetail');if(detailEl&&chosen&&records[chosen]&&!detailEl.querySelector('.kc-history')){
 const card=document.createElement('div');card.className='card kc-history';card.style.marginTop='14px';
 card.innerHTML='<details><summary style="cursor:pointer;font-weight:700">🏆 Past Champions ('+titles[chosen]+')</summary><div style="padding-top:12px">'+records[chosen].slice().reverse().map(([year,k])=>'<div class="item"><b>'+year+'</b> · '+(k?esc(teams[k])+' — '+esc(people[k]):'The Caronavirus (no tournament champion)')+'</div>').join('')+(chosen==='e5'?'<p class="note">2016: No winner supplied.</p>':'')+(chosen==='e4'?'<p class="note">2016: Marked “x” in historical records; no champion assigned.</p>':'')+'</div></details>';
 detailEl.appendChild(card);
 }
}
const prevRender=render;render=function(){prevRender();showHistory()};
const prevDetail=detail;detail=function(){prevDetail();showHistory()};
showHistory();
})();