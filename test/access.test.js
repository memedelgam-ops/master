import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.js';
const order={name:'Cliente prueba',phone:'8110000000',street:'Calle prueba 1',colony:'Jardines de San Patricio',municipality:'Apodaca',date:'2026-12-10',time:'12:00',notes:'',lifetime:1,samsonite:0,extraLifetime:0,extraSamsonite:0,tables:0,cloths:0,colorQuantities:{Blanco:1},freight:999,promotion:200,deposit:250,status:'Confirmado',history:[{actor:'falso'}]};
test('sesiones, aislamiento, permisos y confirmación final',async t=>{
 const {server,store}=createApp({dbPath:':memory:',secure:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.close();store.db.close()});const base='http://127.0.0.1:'+server.address().port;
 async function call(path,method='GET',body,auth){const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const auth=r=>({cookie:r.cookie,csrf:r.body.csrf});
 assert.equal((await call('/orders')).status,401);
 const a=auth(await call('/register','POST',{name:'Cliente A',email:'a@example.com',password:'test-password-123',role:'admin'}));
 const b=auth(await call('/register','POST',{name:'Cliente B',email:'b@example.com',password:'test-password-456'}));
 assert.equal((await call('/me','GET',null,a)).body.user.role,'client');
 let created=await call('/orders','POST',order,a);assert.equal(created.status,201);let o=created.body.order;assert.equal(o.freight,0);assert.equal(o.deposit,0);assert.equal(o.promotion,null);assert.equal(o.status,'Por revisar');assert.equal(o.history,undefined);
 assert.equal((await call('/orders','GET',null,b)).body.orders.length,0);
 assert.equal((await call('/orders/'+o.id,'GET',null,b)).status,404);
 assert.equal((await call('/orders/'+o.id,'PUT',{...order,version:o.version},b)).status,404);
 assert.equal((await call('/orders/'+o.id,'PUT',{...order,version:o.version},a)).status,403);
 assert.equal((await call('/orders/'+o.id+'/action','POST',{action:'confirm',version:o.version},a)).status,403);
 assert.equal((await call('/orders','POST',order,{cookie:a.cookie,csrf:'wrong'})).status,403);
 store.createAdmin('Elizabeth Torres','e@example.com','admin-test-password');store.createAdmin('Manuel Delgado','m@example.com','admin-test-password');
 const admin=auth(await call('/login','POST',{email:'e@example.com',password:'admin-test-password'}));const manuel=auth(await call('/login','POST',{email:'m@example.com',password:'admin-test-password'}));
 assert.equal((await call('/orders','GET',null,manuel)).body.orders.length,1);
 assert.equal((await call('/login','POST',{email:'e@example.com',password:'incorrecta'})).status,401);
 let r=await call('/orders/'+o.id,'PUT',{...o,freight:100,deposit:0,promotion:null,clothChecked:true},admin);assert.equal(r.status,200);o=r.body.order;
 const action=async(who,action)=>{const r=await call('/orders/'+o.id+'/action','POST',{action,version:o.version},who);if(r.status===200)o=r.body.order;return r};
 assert.equal((await action(admin,'confirm')).status,403);
 assert.equal((await action(admin,'quote')).status,200);
 assert.equal((await action(admin,'accept')).status,403);
 assert.equal((await action(b,'accept')).status,404);
 assert.equal((await action(a,'accept')).status,200);
 const stale=o.version;r=await call('/orders/'+o.id,'PUT',{...o,freight:110,clothChecked:true},admin);o=r.body.order;assert.equal(o.status,'Por revisar');
 assert.equal((await call('/orders/'+o.id+'/action','POST',{action:'accept',version:stale},a)).status,409);
 await action(admin,'quote');await action(a,'accept');assert.equal((await action(admin,'confirm')).status,200);
 r=await call('/orders/'+o.id,'PUT',{...o,deposit:50},admin);o=r.body.order;assert.equal(o.status,'Confirmado');
 assert.equal((await action(admin,'deliver')).status,200);assert.equal((await action(admin,'return')).status,200);
 assert.equal((await call('/logout','POST',{},a)).status,200);assert.equal((await call('/me','GET',null,a)).status,401);
 const credentials=store.db.prepare('SELECT password FROM users').all();assert.ok(credentials.every(u=>u.password!=='test-password-123'));
});
test('datos permanecen al reabrir la base de datos',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {createStore}=await import('../store.js');const dir=await mkdtemp(tmpdir()+'/lizzy-');try{let s=createStore(dir+'/db.sqlite');const u=s.register({name:'Prueba',email:'persist@example.com',password:'persist-password-123'});const o=s.save(u,order);s.db.close();s=createStore(dir+'/db.sqlite');assert.equal(s.get(u,o.id).name,'Cliente prueba');assert.equal(s.login({email:u.email,password:'persist-password-123'}).id,u.id);s.db.close()}finally{await rm(dir,{recursive:true})}
});
test('administradores reservados no acceden hasta activación privada',async()=>{
 const {createStore}=await import('../store.js');const s=createStore(':memory:');try{
 const r=s.reserveAdmin('Elizabeth Torres','reserved@example.com');assert.equal(r.pending,true);
 assert.throws(()=>s.login({email:'reserved@example.com',password:'pending'}));
 assert.throws(()=>s.register({name:'Intruso',email:'reserved@example.com',password:'test-password-123'}));
 assert.throws(()=>s.activateAdmin('Manuel Delgado','reserved@example.com','test-password-123'));
 s.activateAdmin('Elizabeth Torres','reserved@example.com','test-password-123');
 assert.equal(s.login({email:'reserved@example.com',password:'test-password-123'}).role,'admin');
 assert.throws(()=>s.activateAdmin('Elizabeth Torres','reserved@example.com','new-password-123'));
 assert.equal(s.reserveAdmin('Elizabeth Torres','reserved@example.com').pending,false);
 }finally{s.db.close()}
});
