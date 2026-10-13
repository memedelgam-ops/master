import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.js';
export function createApp({dbPath='/workspace/lizzy-data/app.sqlite',secure=true}={}){
 const store=createStore(dbPath),root=fileURLToPath(new URL('./public/',import.meta.url)),attempts=new Map();
 const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 try{const path=new URL(req.url,'http://localhost').pathname;
 if(!path.startsWith('/api/')){if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Método no permitido'});const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/pricing.js':'pricing.js'};if(!files[path])return send(404,{error:'No encontrado'});res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(await readFile(root+files[path]));return}
 let body={};if(req.method!=='GET'){if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Se requiere JSON'});let raw='';for await(const p of req){raw+=p;if(Buffer.byteLength(raw)>32768)return send(413,{error:'Solicitud demasiado grande'})}try{body=JSON.parse(raw||'{}')}catch{return send(400,{error:'JSON inválido'})}}
 if(['/api/login','/api/register'].includes(path)&&req.method==='POST'){const key=req.socket.remoteAddress,a=attempts.get(key)||{count:0,until:Date.now()+900000};if(a.until<Date.now()){a.count=0;a.until=Date.now()+900000}a.count++;attempts.set(key,a);if(a.count>20)return send(429,{error:'Demasiados intentos. Intenta en 15 minutos.'});const user=path.endsWith('register')?store.register(body):store.login(body);const s=store.session(user.id);res.setHeader('Set-Cookie',`lizzy_session=${s.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure?'; Secure':''}`);return send(200,{user,csrf:s.csrf})}
 const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('lizzy_session='))?.slice(14);const s=store.authenticate(token);if(!s)return send(401,{error:'Inicia sesión para continuar'});if(req.method!=='GET'&&req.headers['x-csrf-token']!==s.csrf)return send(403,{error:'Sesión de formulario inválida. Recarga la página.'});
 if(path==='/api/me'&&req.method==='GET')return send(200,{user:s.user,csrf:s.csrf});
 if(path==='/api/logout'&&req.method==='POST'){store.logout(token);res.setHeader('Set-Cookie',`lizzy_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure?'; Secure':''}`);return send(200,{ok:true})}
 if(path==='/api/orders'&&req.method==='GET')return send(200,{orders:store.list(s.user)});
 if(path==='/api/orders'&&req.method==='POST')return send(201,{order:store.save(s.user,body)});
 const m=path.match(/^\/api\/orders\/([a-f0-9-]+)(\/action)?$/);
 if(m&&req.method==='GET')return send(200,{order:store.get(s.user,m[1])});
 if(m&&req.method==='PUT'&&!m[2])return send(200,{order:store.save(s.user,body,m[1])});
 if(m&&req.method==='POST'&&m[2])return send(200,{order:store.action(s.user,m[1],body)});
 send(404,{error:'No encontrado'});
 }catch(e){send(e.status||400,{error:e.message})}});return {server,store};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {server}=createApp({dbPath:process.env.LIZZY_DB_PATH||'/workspace/lizzy-data/app.sqlite',secure:process.env.LIZZY_LOCAL_HTTP!=='1'});server.listen(Number(process.env.PORT||3000),process.env.LIZZY_LOCAL_HTTP==='1'?'127.0.0.1':'0.0.0.0',()=>console.log('Lizzy Torres: servidor iniciado'));}
