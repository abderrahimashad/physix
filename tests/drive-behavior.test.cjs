const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('assets/admin-drive.js','utf8');
const folder='classFolder12345',fileId='testPdfFile12345';
function harness(handler,{email='dahim78@gmail.com',scope=true}={}){
 const calls=[];
 const window={PHYSIX_DRIVE_CONFIG:{clientId:'test-client',pickerApiKey:'test-key',appId:'123',rootFolderId:'rootFolder12345',classFolders:{'TEST':folder},expectedEmail:'dahim78@gmail.com'},
  gapi:{load:(_,done)=>done()},google:{accounts:{oauth2:{hasGrantedAllScopes:()=>scope,initTokenClient:opts=>({requestAccessToken(){opts.callback({access_token:'test-only',expires_in:3600})}})}}}};
 const response=(status,body={},headers={})=>({status,ok:status>=200&&status<300,headers:new Headers(headers),json:async()=>body});
 const context={window,location:{origin:'https://physix-rho.vercel.app'},URL,Blob,AbortSignal,Date,console,
  document:{querySelector:()=>({dataset:{ready:'yes'}})},
  setTimeout:(fn,ms)=>ms===12000?0:setTimeout(fn,0),clearTimeout,
  fetch:async(url,options)=>{calls.push({url,options});if(url.includes('/about?'))return response(200,{user:{emailAddress:email}});return handler(url,options,response)}};
 vm.runInNewContext(source,context);
 return {drive:window.physixDrive,calls,response};
}
function pdf(size=32){return {name:'test.pdf',type:'application/pdf',size,slice:(start,end)=>start===0&&end===5?new Blob(['%PDF-']):new Blob(['x'.repeat(end-start)])}}
const privateFolder={mimeType:'application/vnd.google-apps.folder',ownedByMe:true,capabilities:{canAddChildren:true},permissions:[{type:'user'}]};
test('only configured owner and explicit drive.file consent can connect',async()=>{
 const h=harness(()=>{}, {email:'other@example.test'});await assert.rejects(h.drive.connect(),/compte connecté/);assert.equal(h.drive.isConnected(),false);
 const denied=harness(()=>{},{scope:false});await assert.rejects(denied.drive.connect(),/accordé/);assert.equal(denied.drive.isConnected(),false);
});
test('unmapped classes, non-PDF content, public folders fail before upload',async()=>{
 const h=harness((url,o,r)=>r(200,{...privateFolder,permissions:[{type:'anyone'}]}));await h.drive.connect();
 await assert.rejects(h.drive.uploadPdf(pdf(),{classCode:'NEW'}),/configuré/);
 await assert.rejects(h.drive.uploadPdf(pdf(),{classCode:'TEST'}),/privé/);
 const invalid=pdf();invalid.slice=()=>new Blob(['no pdf']);await assert.rejects(h.drive.uploadPdf(invalid,{classCode:'TEST'}),/valide/);
 assert.equal(h.calls.some(x=>x.options.method==='POST'),false);
});
test('rejects resumable redirect outside Google before sending bearer token',async()=>{
 const h=harness((url,o,r)=>url.includes('uploadType=')?r(200,{}, {Location:'https://evil.example/upload'}):r(200,privateFolder));await h.drive.connect();
 await assert.rejects(h.drive.uploadPdf(pdf(),{classCode:'TEST'}),/Destination/);
 assert.equal(h.calls.some(x=>x.url.includes('evil.example')),false);
});
test('lost final response is recovered by status probe without duplicate upload',async()=>{
 let puts=0;
 const h=harness((url,o,r)=>{
  if(url.includes('uploadType='))return r(200,{}, {Location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=test'});
  if(o.method==='PUT'){
   puts++;if(puts===1)throw Error('network');
   assert.equal(o.headers['Content-Range'],'bytes */32');
   return r(200,{id:fileId,size:'32',mimeType:'application/pdf'});
  }return r(200,privateFolder);
 });await h.drive.connect();const file=await h.drive.uploadPdf(pdf(),{classCode:'TEST'});assert.equal(file.id,fileId);assert.equal(puts,2);
});
test('308 without Range resends from zero; confirmed partial offset is used',async()=>{
 let puts=0;const ranges=[];const size=8*1024*1024+10;
 const h=harness((url,o,r)=>{
  if(url.includes('uploadType='))return r(200,{}, {Location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=test'});
  if(o.method==='PUT'){
   ranges.push(o.headers['Content-Range']);puts++;
   if(puts===1)return r(308);
   if(puts===2)return r(308,{}, {Range:'bytes=0-4194303'});
   return r(200,{id:fileId,size:String(size),mimeType:'application/pdf'});
  }return r(200,privateFolder);
 });await h.drive.connect();await h.drive.uploadPdf(pdf(size),{classCode:'TEST'});
 assert.equal(ranges[0],ranges[1]);assert.equal(ranges[2],`bytes 4194304-${size-1}/${size}`);
});
test('nonretryable 403 is not repeated and no-progress retries are bounded',async()=>{
 for(const status of [403,308]){
  let puts=0;const h=harness((url,o,r)=>{if(url.includes('uploadType='))return r(200,{}, {Location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=test'});if(o.method==='PUT'){puts++;return r(status)}return r(200,privateFolder)});
  await h.drive.connect();await assert.rejects(h.drive.uploadPdf(pdf(),{classCode:'TEST'}));assert.equal(puts,status===403?1:5);
 }
});
test('delete trashes only owned PDFs in PhysiX folders; disconnect clears access',async()=>{
 let valid=false;const h=harness((url,o,r)=>o.method==='PATCH'?r(200,{id:fileId,trashed:true}):r(200,{mimeType:'application/pdf',ownedByMe:true,parents:[valid?folder:'outside']}));
 await h.drive.connect();await assert.rejects(h.drive.removePdf(fileId),/extérieur/);valid=true;await h.drive.removePdf(fileId);
 const mutation=h.calls.find(x=>x.options.method==='PATCH');assert.equal(JSON.parse(mutation.options.body).trashed,true);assert.equal(h.calls.some(x=>x.options.method==='DELETE'),false);
 h.drive.disconnect();assert.equal(h.drive.isConnected(),false);await assert.rejects(h.drive.removePdf(fileId),/expirée/);
});
