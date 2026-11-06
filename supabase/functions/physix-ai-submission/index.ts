/* PhysiX private handwritten-solution photo endpoint.
   Signed-in pupil uploads image; teacher alone can view it.
   SHA-256 calculated from received bytes SERVER-SIDE (never trust client hash).
   An activity credit is issued ONLY after owner approval in SQL. */
import {createClient} from "npm:@supabase/supabase-js@2";
const BASE=Deno.env.get("SUPABASE_URL")||"";
function pubKey(){try{return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")||""}catch{return Deno.env.get("SUPABASE_ANON_KEY")||""}}
function secret(){try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||""}catch{return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||""}}
const err=(status:number,message:string)=>Response.json({message},{status,headers:{"Cache-Control":"no-store"}});
function validImage(b:Uint8Array,mime:string){
 if(mime==="image/jpeg")return b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255;
 if(mime==="image/png")return b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x);
 if(mime==="image/webp")return b.length>=12&&String.fromCharCode(...b.slice(0,4))==="RIFF"&&
 String.fromCharCode(...b.slice(8,12))==="WEBP";
 return false;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin&&origin!=="https://physix-rho.vercel.app")return err(403,"Origine non autorisée.");
 if(!BASE||!pubKey()||!secret())return err(503,"Stockage non configuré.");
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
 if(!jwt||jwt.length>4096)return err(401,"Connectez-vous.");
 const member=createClient(BASE,pubKey(),{global:{headers:{Authorization:"Bearer "+jwt}},
  auth:{autoRefreshToken:false,persistSession:false}});
 const {data:userData,error:userError}=await member.auth.getUser(jwt);
 if(userError||!userData.user)return err(401,"Session expirée.");
 const user=userData.user;
 const service=createClient(BASE,secret(),{auth:{autoRefreshToken:false,persistSession:false}});
 if(req.method==="GET"){
  const id=new URL(req.url).searchParams.get("id");
  if(!id||!/^[0-9a-f-]{36}$/i.test(id))return err(400,"Copie invalide.");
  const {data:row,error:lookupError}=await service.from("physix_ai_submissions")
   .select("owner_id,storage_path,mime_type").eq("id",id).maybeSingle();
  if(lookupError||!row||row.owner_id!==user.id)return err(403,"Copie privée réservée au professeur.");
  const {data:blob,error:downloadError}=await service.storage.from("physix-solutions").download(row.storage_path);
  if(downloadError||!blob)return err(404,"Image introuvable.");
  return new Response(blob,{headers:{"Content-Type":row.mime_type,"Cache-Control":"no-store",
   "Content-Disposition":"inline; filename=solution","X-Content-Type-Options":"nosniff"}});
 }
 if(req.method!=="POST")return err(405,"Méthode interdite.");
 const id=req.headers.get("x-physix-exercise-id")||"";
 if(!/^[0-9a-f-]{36}$/i.test(id))return err(400,"Exercice invalide.");
 const mime=(req.headers.get("content-type")||"").split(";")[0].toLowerCase();
 const len=Number(req.headers.get("content-length")||0);
 if(len>5242880)return err(413,"Image trop volumineuse (maximum 5 Mo).");
 const {data:context,error:contextError}=await member.rpc("physix_ai_upload_context",{p_exercise:id});
 if(contextError||!Array.isArray(context)||context.length!==1)return err(403,"Exercice inaccessible à votre compte.");
 const {owner_id:owner,pupil_id:pupil}=context[0];
 // Avoid unnecessary uploads for an existing response to same exercise.
 const {data:old,error:oldErr}=await service.from("physix_ai_submissions")
  .select("id").eq("exercise_id",id).eq("pupil_id",pupil).maybeSingle();
 if(oldErr)return err(503,"Impossible de vérifier les copies existantes.");
 if(old)return err(409,"Vous avez déjà remis une solution pour cet exercice.");
 let bytes:Uint8Array;
 try{
  const raw=await req.arrayBuffer();
  if(raw.byteLength<1024||raw.byteLength>5242880)return err(413,"Photo invalide : de 1 Ko à 5 Mo.");
  bytes=new Uint8Array(raw);
 }catch{return err(400,"Fichier non lisible.");}
 if(!validImage(bytes,mime))return err(415,"Seules de vraies images JPEG, PNG ou WebP sont admises.");
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");
 const {data:duplicate,error:dupErr}=await service.from("physix_ai_submissions")
  .select("id").eq("owner_id",owner).eq("exercise_id",id).eq("sha256",digest).maybeSingle();
 if(dupErr)return err(503,"Contrôle des doublons indisponible.");
 if(duplicate)return err(409,"Cette image exacte a déjà été remise pour cet exercice.");
 const extension=mime==="image/jpeg"?"jpg":mime==="image/png"?"png":"webp";
 const storagePath=owner+"/"+id+"/"+user.id+"/"+crypto.randomUUID()+"."+extension;
 const {error:uploadErr}=await service.storage.from("physix-solutions").upload(storagePath,bytes,{
  contentType:mime,cacheControl:"0",upsert:false});
 if(uploadErr)return err(503,"Impossible de sauvegarder la photo privée.");
 const {error:insertErr}=await service.from("physix_ai_submissions").insert({
  owner_id:owner,exercise_id:id,pupil_id:pupil,auth_user_id:user.id,
  storage_path:storagePath,sha256:digest,mime_type:mime,bytes_size:bytes.length
 });
 if(insertErr){
  await service.storage.from("physix-solutions").remove([storagePath]);
  return err(insertErr.code==="23505"?409:503,
   insertErr.code==="23505"?"Copie déjà enregistrée ou image identique.":"Enregistrement impossible.");
 }
 return Response.json({status:"pending",message:"Copie reçue. Elle sera comptée dans l'activité après validation du professeur."},
  {status:201,headers:{"Cache-Control":"no-store"}});
});