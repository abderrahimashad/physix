/* Owner-only in-site alerts for submitted exercises (no external push notifications). */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let checkTimer=null,previousSession=null,el=null,previousIds=new Set();
window.physixAdminNotificationsInit=({session,openTab})=>{
 if(checkTimer)clearInterval(checkTimer);
 el?.remove();
 previousSession=session.token;previousIds=new Set();
 el=document.createElement("aside");
 el.className="px-notifications";
 el.innerHTML='<button type="button" id="px-notify-toggle" aria-expanded="false" aria-controls="px-notify-menu">'+
  '🔔 Notifications <span id="px-notify-count" hidden></span></button>'+
  '<div id="px-notify-menu" hidden><h3>Copies à valider</h3>'+
  '<div id="px-notify-feed" role="status">Chargement…</div>'+
  '<button type="button" id="px-notify-open">Voir les copies</button></div>';
 document.body.append(el);
 const count=el.querySelector("#px-notify-count"),feed=el.querySelector("#px-notify-feed"),menu=el.querySelector("#px-notify-menu");
 const toggle=el.querySelector("#px-notify-toggle");
 toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute("aria-expanded",String(!menu.hidden));
  if(!menu.hidden)refresh()};
 el.querySelector("#px-notify-open").onclick=()=>{menu.hidden=true;toggle.setAttribute("aria-expanded","false");openTab("remises")};
 async function refresh(){
  if(!document.body.contains(el)||document.hidden||previousSession!==session.token)return;
  try{
   const response=await fetch(BASE+"/rest/v1/rpc/physix_teacher_pending_copies",{
    method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.token,"Content-Type":"application/json"},
    body:"{}",cache:"no-store",referrerPolicy:"no-referrer"});
   if(!response.ok)throw Error("Impossible d’actualiser les copies.");
   const rows=await response.json();
   if(!Array.isArray(rows))throw Error("Réponse invalide.");
   const number=Number(rows[0]?.total_pending||0);
   count.hidden=number===0;count.textContent=number>99?"99+":String(number);
   toggle.setAttribute("aria-label",number+" copie(s) à valider");
   feed.innerHTML=rows.length?rows.map(row=>
    '<article class="px-notification-item"><strong>'+esc(row.pupil_name)+'</strong>'+
    '<small>'+esc(row.class_code)+' · '+esc(row.exercise_title)+'</small>'+
    '<time>'+new Date(row.submitted_at).toLocaleString("fr-FR")+'</time></article>').join(""):
    '<p>Aucune nouvelle copie à valider.</p>';
   // In-site badge only; do not expose browser system notifications or student identity outside authenticated Admin.
   previousIds=new Set(rows.map(r=>r.submission_id));
  }catch(error){feed.textContent=error.message}
 }
 refresh();
 // Visible in-site alert; updates while the Admin page remains open.
 checkTimer=setInterval(refresh,45000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()},{passive:true});
 window.physixAdminNotificationsRefresh=refresh;
};
})();