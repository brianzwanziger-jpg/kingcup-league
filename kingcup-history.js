/* Historical KingCup champions, supplied by commissioner. Read-only; does not change season scoring. */
(()=>{
const teams={
 Z:"Ziggies",C:"The Caucasians",B:"B-Rad Ballerz",S:"Show Me Your TD's",T:"Turndog Troubadours",R:"Redbirds",E:"BEASts",I:"In a Pickle Bickell",J:"Satch"
};
const people={Z:"Brian Zwanziger",C:"Kevin Jones",B:"Brad Ethridge",S:"Chris Elliot",T:"Matt Turner",R:"Josh Calavan",E:"Geoff Beasley",I:"Joe Bickell",J:"Josh Morris"};
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
 if(home){const card=home.querySelector('.card:nth-child(2)');if(card){const rows=[...card.querySelectorAll('.item.row')];rows.forEach(row=>{
 const name=row.querySelector('.grow b')?.textContent;const key=Object.keys(teams).find(k=>norm(teams[k])===norm(name));if(!key||row.querySelector('.kc-trophy'))return;
 const won=all.filter(x=>x.key===key).sort((a,b)=>b.year-a.year);
 const el=document.createElement('details');el.className='kc-trophy';el.style.cssText='margin:7px 0 0;font-size:13px';
 el.innerHTML='<summary style="cursor:pointer;color:#f4d381">🏆 '+won.length+' '+(won.length===1?'trophy':'trophies')+' · View history</summary><div style="padding:8px 0">'+(won.length?won.map(x=>'<div style="padding:4px 0">'+x.year+' · '+esc(titles[x.event])+'</div>').join(''):'No past championships recorded')+'</div>';
 row.querySelector('.grow')?.appendChild(el);
 })}}
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