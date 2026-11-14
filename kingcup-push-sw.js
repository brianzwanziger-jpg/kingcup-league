self.addEventListener('push',event=>{
 let v={};try{v=event.data?.json()||{}}catch{}
 event.waitUntil(self.registration.showNotification(v.title||'KingCup GameDay',{
  body:v.body||'New GameDay update',icon:'./kingcup-push-icon.svg',badge:'./kingcup-push-icon.svg',
  tag:v.tag||'kingcup-gameday',data:{url:v.url||'./'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'./',self.registration.scope);
 if(target.origin!==self.location.origin||!target.href.startsWith(self.registration.scope))return;
 event.waitUntil((async()=>{
  const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
  const same=windows.find(c=>{
   try{const u=new URL(c.url);return u.origin===target.origin&&u.pathname===target.pathname&&u.search===target.search}catch{return false}
  });
  if(same){
   if(same.url!==target.href&&typeof same.navigate==='function'){
    try{const updated=await same.navigate(target.href);if(updated)return updated.focus()}catch(e){}
   }
   return same.focus();
  }
  return clients.openWindow(target.href);
 })());
});