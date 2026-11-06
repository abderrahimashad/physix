/* PhysiX — gestion des classes appartenant au propriétaire. */
(()=>{
"use strict";
window.physixClassRender=(root,{rows,session,rest,refresh,esc,opt,alertText})=>{
 const section=document.createElement("section");section.className="content-section physix-class-panel";
 const classes=rows.classes||[];
 section.innerHTML='<h3>Ajouter une classe</h3><form id="physix-class-form" class="content-form">'+
 '<label>Niveau<select name="level" required>'+opt([["1BAC","1ère BAC"],["2BAC PC","2ème BAC PC"]],"1BAC")+'</select></label>'+
 '<label>Nom de la classe<input name="code" type="text" placeholder="Ex. 1BAC BIOF G4" minlength="2" maxlength="70" required></label>'+
 '<div class="full"><button type="submit">+ Ajouter la classe</button></div></form>'+
 '<h3 style="margin-top:30px">Mes classes ('+classes.filter(x=>x.active).length+')</h3>'+
 '<p>« Retirer » masque une classe de la liste des nouveaux documents sans supprimer ses anciens PDF.</p>'+
 '<div class="content-items">'+(classes.map(c=>
 '<article class="content-item"><strong>'+esc(c.code)+'</strong><p>'+esc(c.level)+' · '+(c.active?"Active":"Retirée")+'</p>'+
 '<div class="content-actions"><button type="button" data-class-switch="'+esc(c.id)+'">'+(c.active?"Retirer cette classe":"Réactiver")+'</button></div></article>'
 ).join("")||'<p>Aucune classe.</p>')+'</div>'+
 '<div id="classes-feedback" class="content-note" role="status" aria-live="polite"></div>';
 root.append(section);
 const feedback=(message,bad=false)=>{const el=section.querySelector("#classes-feedback");if(el){el.textContent=message;el.className="content-note"+(bad?" bad":"")}};
 const form=section.querySelector("#physix-class-form");let busy=false;
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(busy)return;busy=true;form.querySelector("button[type=submit]").disabled=true;
  try{
   const level=form.elements.level.value,code=form.elements.code.value.trim().replace(/\\s+/g," ");
   if(code.length<2||code.length>70)throw Error("Indiquez un nom de classe entre 2 et 70 caractères.");
   if(!["1BAC","2BAC PC"].includes(level))throw Error("Niveau invalide.");
   if(classes.some(c=>c.code.toLowerCase()===code.toLowerCase()))throw Error("Cette classe existe déjà. Réactivez-la si nécessaire.");
   const data=await rest("classes","","POST",{owner_id:session.ownerId,level,code,active:true});
   if(!Array.isArray(data)||data.length!==1)throw Error("L'ajout n'a pas été confirmé.");
   await refresh();
   alertText("Classe ajoutée à vos choix.");
  }catch(error){feedback(error.message,true)}
  finally{busy=false;const button=form.querySelector("button[type=submit]");if(button)button.disabled=false}
 });
 section.querySelectorAll("[data-class-switch]").forEach(btn=>btn.addEventListener("click",async()=>{
  if(busy)return;
  const record=classes.find(x=>x.id===btn.dataset.classSwitch);if(!record)return;
  if(record.active&&!confirm("Retirer « "+record.code+" » des prochaines sélections ? Ses anciens PDF restent privés et conservés."))return;
  busy=true;btn.disabled=true;
  try{
   const updated=await rest("classes","?id=eq."+encodeURIComponent(record.id),"PATCH",{active:!record.active});
   if(!Array.isArray(updated)||updated.length!==1)throw Error("Modification non confirmée.");
   await refresh();alertText(record.active?"Classe retirée de la sélection.":"Classe réactivée.");
  }catch(error){feedback(error.message,true)}
  finally{busy=false;btn.disabled=false}
 }));
};
})();