/* PhysiX — manual photo submissions: no AI, no automatic activity credit.
   One upload per exercise, 1-4 private image pages, server-side exact SHA-256 deduplication. */
import {createClient} from "npm:@supabase/supabase-js@2";
const BASE=Deno.env.get("SUPABASE_URL")||"";
function pubKey(){try{return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")||""}catch{return Deno.env.get("SUPABASE_ANON_KEY")||""}}
function secret(){try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||""}catch{return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||""}}
const ORIGIN="https://physix-rho.vercel.app";
const headers={"Access-Control-Allow-Origin":ORIGIN,
 "Access-Control-Allow-Headers":"apikey, authorization, content-type, x-physix-exercise-id",
 "Access-Control-Allow-Methods":"POST, GET, OPTIONS",
 "Cache-Control":"no-store","Vary":"Origin"};
const fail=(status:number,message:string)=>Response.json({message},{status,headers});
function validImage(b:Uint8Array,mime:string){
 if(mime==="image/jpeg")return b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255;
 if(mime==="image/png")return b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x);
 if(mime==="image/webp")return b.length>=12&&String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP";
 return false;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin&&origin!==ORIGIN)return fail(403,"Origine non autorisée.");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(!BASE||!pubKey()||!secret())return fail(503,"Stockage non configuré.");
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
 if(!jwt||jwt.length>4096)return fail(401,"Connectez-vous.");
 const member=createClient(BASE,pubKey(),{global:{headers:{Authorization:"Bearer "+jwt}},
  auth:{autoRefreshToken:false,persistSession:false}});
 const {data:user,error:userError}=await member.auth.getUser(jwt);
 if(userError||!user.user)return fail(401,"Session invalide ou expirée.");
 const admin=createClient(BASE,secret(),{auth:{autoRefreshToken:false,persistSession:false}});
 if(req.method==="GET"){
  const id=new URL(req.url).searchParams.get("page_id");
  if(!id||!/^[a-f0-9-]{36}$/i.test(id))return fail(400,"Page invalide.");
  const {data:page,error:lookupError}=await admin.from("physix_submission_pages")
   .select("owner_id,storage_path,mime_type").eq("id",id).maybeSingle();
  if(lookupError||!page||page.owner_id!==user.user.id)return fail(403,"Copie privée du professeur.");
  const {data:blob,error:e}=await admin.storage.from("physix-solutions").download(page.storage_path);
  if(e||!blob)return fail(404,"Photo introuvable.");
  return new Response(blob,{headers:{...headers,"Content-Type":page.mime_type,
   "Content-Disposition":"inline; filename=solution","X-Content-Type-Options":"nosniff"}});
 }
 if(req.method!=="POST")return fail(405,"Méthode non autorisée.");
 const exercise=req.headers.get("x-physix-exercise-id")||"";
 if(!/^[0-9a-f-]{36}$/i.test(exercise))return fail(400,"Exercice invalide.");
 if(Number(req.headers.get("content-length")||0)>21*1024*1024)return fail(413,"Envoi trop volumineux.");
 const {data:ctx,error:ctxError}=await member.rpc("physix_ai_upload_context",{p_exercise:exercise});
 if(ctxError||!Array.isArray(ctx)||ctx.length!==1)return fail(403,"Exercice non autorisé.");
 const {owner_id:owner,pupil_id:pupil}=ctx[0];
 const {data:old,error:oldError}=await admin.from("physix_ai_submissions").select("id")
  .eq("exercise_id",exercise).eq("pupil_id",pupil).maybeSingle();
 if(oldError)return fail(503,"Impossible de vérifier les remises.");
 if(old)return fail(409,"Une solution a déjà été remise pour cet exercice.");
 let form:FormData;
 try{form=await req.formData()}catch{return fail(400,"Fichiers illisibles.");}
 const files=form.getAll("photos");
 if(files.length<1||files.length>4||files.some(f=>!(f instanceof File)))
  return fail(400,"Choisissez de 1 à 4 photos JPG, PNG ou WebP.");
 const prepared:{bytes:Uint8Array,hash:string,mime:string,path:string}[]=[];
 for(const item of files){
  const f=item as File;
  if(f.size<1024||f.size>5242880)return fail(413,"Chaque photo doit faire entre 1 Ko et 5 Mo.");
  if(!["image/jpeg","image/png","image/webp"].includes(f.type))return fail(415,"Format d’image non accepté.");
  const bytes=new Uint8Array(await f.arrayBuffer());
  if(!validImage(bytes,f.type))return fail(415,"Fichier image non valide.");
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)))
   .map(n=>n.toString(16).padStart(2,"0")).join("");
  if(prepared.some(p=>p.hash===hash))return fail(409,"Vous avez ajouté deux fois la même photo.");
  const ext=f.type==="image/jpeg"?"jpg":f.type==="image/png"?"png":"webp";
  prepared.push({bytes,hash,mime:f.type,path:owner+"/"+exercise+"/"+user.user.id+"/"+crypto.randomUUID()+"."+ext});
 }
 const {data:dupes,error:dupesErr}=await admin.from("physix_submission_pages")
  .select("id").eq("owner_id",owner).eq("exercise_id",exercise)
  .in("sha256",prepared.map(p=>p.hash)).limit(1);
 if(dupesErr)return fail(503,"Vérification des images indisponible.");
 if(dupes?.length)return fail(409,"Une photo identique a déjà été remise pour cet exercice.");
 const paths:string[]=[];
 try{
  for(const page of prepared){
   const {error:e}=await admin.storage.from("physix-solutions").upload(page.path,page.bytes,{
    contentType:page.mime,cacheControl:"0",upsert:false});
   if(e)throw Error("Échec du stockage des copies.");
   paths.push(page.path);
  }
  const first=prepared[0];
  const {data:submission,error:insertErr}=await admin.from("physix_ai_submissions").insert({
   owner_id:owner,exercise_id:exercise,pupil_id:pupil,auth_user_id:user.user.id,
   storage_path:first.path,sha256:first.hash,mime_type:first.mime,bytes_size:first.bytes.length
  }).select("id").single();
  if(insertErr||!submission)throw Error(insertErr?.code==="23505"?"Solution déjà remise.":"Enregistrement refusé.");
  const {error:pagesError}=await admin.from("physix_submission_pages").insert(prepared.map((p,i)=>({
   submission_id:submission.id,owner_id:owner,exercise_id:exercise,page_number:i+1,
   storage_path:p.path,sha256:p.hash,mime_type:p.mime,bytes_size:p.bytes.length
  })));
  if(pagesError){
   await admin.from("physix_ai_submissions").delete().eq("id",submission.id);
   throw Error(pagesError.code==="23505"?"Cette photo a déjà été remise.":"Enregistrement des pages impossible.");
  }
 }catch(e){
  if(paths.length)await admin.storage.from("physix-solutions").remove(paths);
  return fail(409,e instanceof Error?e.message:"Envoi impossible.");
 }
 return Response.json({status:"pending",message:"Photos reçues, en attente de la validation du professeur."},
  {status:201,headers});
});