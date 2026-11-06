/* PhysiX — teacher's class work, announcements, personal objectives and identity linking. */
(()=>{
"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>d?new Date(d+"T12:00:00").toLocaleDateString("fr-FR"):"Sans échéance";
window.physixPedagogyRender=(root,{rows,session,rest})=>{
 const rootEl=document.createElement("section");
 rootEl.className="content-section px-pedagogy";
 rootEl.innerHTML='<h3>📚 Travail à faire, annonces et objectifs</h3>'+
 '<p>Tout reste privé par défaut. Vous décidez quand publier pour une classe ou rendre un objectif visible à un élève lié.</p>'+
 '<div class="px-ped-toolbar"><label>Classe<select id="px-ped-class"></select></label>'+
 '<label>Semestre<select id="px-ped-sem"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></label></div>'+
 '<div class="content-note" role="status" id="px-ped-note">Chargement…</div>'+
 '<div class="px-ped-panels">'+
 '<section><h4>📘 Travail à faire</h4><form id="px-ped-work">'+
 '<label>Titre<input name="title" maxlength="160" minlength="3" required placeholder="Exercices 1 à 5 — Ondes"></label>'+
 '<label>Consignes<textarea name="instructions" maxlength="1500" rows="3" placeholder="Pages et numéros des exercices"></textarea></label>'+
 '<label>À faire avant le<input name="due_on" type="date"></label><button type="submit">Ajouter (brouillon)</button></form>'+
 '<div id="px-ped-work-list"></div></section>'+
 '<section><h4>📢 Annonces de classe</h4><form id="px-ped-announcements">'+
 '<label>Titre<input name="title" maxlength="160" minlength="3" required placeholder="Contrôle de physique"></label>'+
 '<label>Annonce<textarea name="message" minlength="3" maxlength="1500" rows="4" required></textarea></label>'+
 '<button type="submit">Ajouter (brouillon)</button></form><div id="px-ped-ann-list"></div></section>'+
 '<section><h4>🎯 Objectifs individuels</h4><form id="px-ped-objectives">'+
 '<label>Élève<select name="pupil_id" required></select></label>'+
 '<label>Objectif<input name="title" maxlength="180" minlength="3" required placeholder="Participer davantage en classe"></label>'+
 '<button type="submit">Ajouter (privé)</button></form><div id="px-ped-goals"></div></section>'+
 '<section><h4>🔗 Associations e-mail historiques</h4>'+
 '<p>Pour les nouveaux élèves, utilisez « 🔑 Code d’activation » dans Suivi des élèves. Le lien au compte vérifié se crée automatiquement. Ce formulaire reste réservé aux anciennes invitations e-mail.</p>'+
 '<form id="px-ped-links"><label>Élève<select name="pupil_id" required></select></label>'+
 '<label>Adresse autorisée<select name="access_id" required></select></label>'+
 '<button type="submit">Associer</button></form><div id="px-ped-linked"></div></section>'+
 '</div>';
 root.append(rootEl);
 const q=s=>rootEl.querySelector(s),classes=(rows.classes||[]).filter(x=>x.active);
 let classCode=classes[0]?.code||"",semester=1,work=[],announcements=[],goals=[],pupils=[],access=[],links=[],busy=false;
 q("#px-ped-class").innerHTML=classes.map(c=>'<option value="'+esc(c.code)+'">'+esc(c.code)+'</option>').join("");
 const feedback=(m,bad=false)=>{const e=q("#px-ped-note");e.textContent=m;e.classList.toggle("bad",bad)};
 async function load(){
  if(!classCode){feedback("Ajoutez une classe avant de commencer.",true);return}
  feedback("Chargement…");
  try{
   [work,announcements,pupils,access,links]=await Promise.all([
    rest("class_work","?select=*&class_code=eq."+encodeURIComponent(classCode)+"&order=created_at.desc&limit=200"),
    rest("class_announcements","?select=*&class_code=eq."+encodeURIComponent(classCode)+"&order=created_at.desc&limit=200"),
    rest("pupils","?select=*&active=eq.true&class_code=eq."+encodeURIComponent(classCode)+"&order=full_name.asc&limit=300"),
    rest("student_access","?select=*&enabled=eq.true&class_code=eq."+encodeURIComponent(classCode)+"&order=email.asc&limit=300"),
    rest("pupil_links","?select=*&limit=500")
   ]);
   const pupilIds=pupils.map(p=>p.id);
   goals=pupilIds.length?await rest("pupil_objectives","?select=*&pupil_id=in.("+pupilIds.join(",")+")&order=created_at.desc&limit=500"):[];
   draw();feedback("Toutes les modifications sont enregistrées dans votre espace privé.");
  }catch(e){feedback("Chargement refusé : "+e.message,true)}
 }
 function controls(table,x,published){
  return '<div class="px-ped-item"><div><strong>'+esc(x.title)+'</strong>'+
  (x.instructions?'<small>'+esc(x.instructions)+'</small>':"")+
  (x.message?'<small>'+esc(x.message)+'</small>':"")+
  (x.due_on?'<small>À faire avant le '+fmt(x.due_on)+'</small>':"")+
  '<small>'+(published?"✅ Visible par la classe":"🔒 Brouillon privé")+'</small></div>'+
  '<div class="px-ped-actions"><button data-toggle="'+table+':'+esc(x.id)+'">'+(published?"Masquer":"Publier")+'</button>'+
  '<button data-remove="'+table+':'+esc(x.id)+'" class="danger">Supprimer</button></div></div>';
 }
 function draw(){
  const active=work.filter(w=>w.semester===semester);
  q("#px-ped-work-list").innerHTML=active.length?active.map(w=>controls("class_work",w,w.published)).join(""):"<p>Aucun travail pour ce semestre.</p>";
  q("#px-ped-ann-list").innerHTML=announcements.length?announcements.map(n=>controls("class_announcements",n,n.published)).join(""):"<p>Aucune annonce.</p>";
  const options=pupils.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.full_name)+'</option>').join("");
  q("#px-ped-objectives").elements.pupil_id.innerHTML=options;
  const reserved=new Set(links.map(l=>l.access_id));
  q("#px-ped-links").elements.pupil_id.innerHTML=options;
  q("#px-ped-links").elements.access_id.innerHTML=access.filter(a=>!reserved.has(a.id)).map(a=>
   '<option value="'+esc(a.id)+'">'+esc(a.email)+'</option>').join("");
  q("#px-ped-goals").innerHTML=goals.filter(g=>g.semester===semester).map(g=>{
   const p=pupils.find(p=>p.id===g.pupil_id);
   return '<div class="px-ped-item"><div><strong>'+esc(p?.full_name||"Élève archivé")+'</strong>'+
    '<small>'+esc(g.title)+' · '+(g.status==="achieved"?"✅ Atteint":"En cours")+
    ' · '+(g.visible?"Visible par l’élève":"Privé")+'</small></div><div class="px-ped-actions">'+
    '<button data-goal-visible="'+esc(g.id)+'">'+(g.visible?"Masquer":"Partager")+'</button>'+
    '<button data-goal-status="'+esc(g.id)+'">'+(g.status==="achieved"?"Reprendre":"Marquer atteint")+'</button>'+
    '<button data-goal-remove="'+esc(g.id)+'" class="danger">Supprimer</button></div></div>';
  }).join("")||"<p>Aucun objectif pour ce semestre.</p>";
  q("#px-ped-linked").innerHTML=links.filter(l=>pupils.some(p=>p.id===l.pupil_id)).map(l=>{
   const p=pupils.find(p=>p.id===l.pupil_id),a=access.find(a=>a.id===l.access_id);
   return '<div class="px-ped-item"><div><strong>'+esc(p?.full_name||"Élève")+'</strong><small>'+
     esc(a?.email||"Invitation désactivée")+'</small></div>'+
     '<button data-unlink="'+esc(l.id)+'" class="danger">Dissocier</button></div>';
  }).join("")||"<p>Aucun profil associé à un compte.</p>";
  rootEl.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggle(b));
  rootEl.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>remove(b));
  rootEl.querySelectorAll("[data-goal-visible]").forEach(b=>b.onclick=()=>changeGoal(b,"visible"));
  rootEl.querySelectorAll("[data-goal-status]").forEach(b=>b.onclick=()=>changeGoal(b,"status"));
  rootEl.querySelectorAll("[data-goal-remove]").forEach(b=>b.onclick=()=>removeGoal(b));
  rootEl.querySelectorAll("[data-unlink]").forEach(b=>b.onclick=()=>unlink(b));
 }
 async function operation(fn,button){
  if(busy)return;busy=true;if(button)button.disabled=true;
  try{await fn();await load()}catch(e){feedback(e.message,true)}
  finally{busy=false;if(button)button.disabled=false}
 }
 function get(table,id){return(table==="class_work"?work:announcements).find(x=>x.id===id)}
 function toggle(b){
  const [table,id]=b.dataset.toggle.split(":"),x=get(table,id);if(!x)return;
  operation(async()=>{
   const result=await rest(table,"?id=eq."+id,"PATCH",{published:!x.published});
   if(!Array.isArray(result)||result.length!==1)throw Error("Modification non confirmée.");
  },b);
 }
 function remove(b){
  const [table,id]=b.dataset.remove.split(":");if(!confirm("Supprimer définitivement cet élément ?"))return;
  operation(async()=>{const r=await rest(table,"?id=eq."+id,"DELETE");if(r.length!==1)throw Error("Suppression non confirmée.")},b);
 }
 function changeGoal(b,kind){
  const id=kind==="visible"?b.dataset.goalVisible:b.dataset.goalStatus,g=goals.find(x=>x.id===id);if(!g)return;
  const payload=kind==="visible"?{visible:!g.visible}:{status:g.status==="achieved"?"in_progress":"achieved"};
  operation(async()=>{const r=await rest("pupil_objectives","?id=eq."+id,"PATCH",payload);
   if(r.length!==1)throw Error("Objectif non modifié.")},b);
 }
 function removeGoal(b){if(!confirm("Supprimer cet objectif ?"))return;operation(async()=>{
  const r=await rest("pupil_objectives","?id=eq."+b.dataset.goalRemove,"DELETE");if(r.length!==1)throw Error("Suppression non confirmée.")
 },b)}
 function unlink(b){if(!confirm("Dissocier ce compte de l'élève ? Le suivi ne sera plus visible pour ce compte."))return;
  operation(async()=>{const r=await rest("pupil_links","?id=eq."+b.dataset.unlink,"DELETE");if(r.length!==1)throw Error("Dissociation non confirmée.")},b)}
 function submit(formId,table,fields){
  q(formId).addEventListener("submit",event=>{
   event.preventDefault();const form=event.currentTarget,button=form.querySelector("button[type=submit]");
   const values=Object.fromEntries(new FormData(form).entries());
   const payload={owner_id:session.ownerId,...fields(values)};
   if("title" in payload)payload.title=payload.title.trim();
   operation(async()=>{
    const r=await rest(table,"","POST",payload);
    if(!Array.isArray(r)||r.length!==1)throw Error("Enregistrement non confirmé.");
    form.reset();
   },button);
  });
 }
 submit("#px-ped-work","class_work",v=>({class_code:classCode,semester,title:v.title,
  instructions:v.instructions.trim(),due_on:v.due_on||null,published:false}));
 submit("#px-ped-announcements","class_announcements",v=>({class_code:classCode,
  title:v.title,message:v.message.trim(),published:false}));
 submit("#px-ped-objectives","pupil_objectives",v=>({pupil_id:v.pupil_id,semester,
  title:v.title,visible:false,status:"in_progress"}));
 submit("#px-ped-links","pupil_links",v=>({pupil_id:v.pupil_id,access_id:v.access_id}));
 q("#px-ped-class").addEventListener("change",e=>{classCode=e.target.value;load()});
 q("#px-ped-sem").addEventListener("change",e=>{semester=Number(e.target.value);draw()});
 load();
};
})();