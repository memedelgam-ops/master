import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {quote,availability,colors} from './public/pricing.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(m,status=400)=>{throw Object.assign(new Error(m),{status})};
const digest=(v,s)=>scryptSync(v,s,64).toString('hex');
const pub=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
export function createStore(path){
 const db=new DatabaseSync(path);db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),data TEXT NOT NULL);");
 function create(name,email,pw,role){email=String(email||'').trim().toLowerCase();name=String(name||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>150)fail('Revisa nombre y correo');if(typeof pw!=='string'||pw.length<12||pw.length>128)fail('Usa una contraseña de 12 a 128 caracteres');const salt=randomBytes(16).toString('hex'),id=randomUUID();try{db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,name,email,role,salt,digest(pw,salt))}catch{fail('No fue posible crear la cuenta con ese correo')};return {id,name,email,role}}
 function get(u,id){const row=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!row||(u.role!=='admin'&&row.owner!==u.id))fail('Pedido no encontrado',404);const o=JSON.parse(row.data);if(u.role!=='admin')delete o.history;return o}
 function persist(o,owner){db.prepare('INSERT INTO orders VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(o.id,owner,JSON.stringify(o));return o}
 function audit(o,u,action){const q=quote(o);o.history.push({at:new Date().toISOString(),actor:u.name,action,discount:q.discount,total:q.total,reason:o.reason})}
 const api={db,
 reserveAdmin(name,email){
 if(!['Elizabeth Torres','Manuel Delgado'].includes(name))fail('Administrador no autorizado');
 email=String(email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Correo inválido');
 const existing=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(existing){if(existing.name!==name||existing.role!=='admin')fail('El correo pertenece a otra cuenta');return {user:pub(existing),pending:existing.password==='pending'}}
 const id=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,name,email,'admin',randomBytes(16).toString('hex'),'pending');return {user:{id,name,email,role:'admin'},pending:true};
 },
 activateAdmin(name,email,pw){
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(email||'').trim().toLowerCase());
 if(!u||u.name!==name||u.role!=='admin'||u.password!=='pending')fail('La cuenta no está pendiente de activación');
 if(typeof pw!=='string'||pw.length<12||pw.length>128)fail('Usa una contraseña de 12 a 128 caracteres');
 const salt=randomBytes(16).toString('hex');db.prepare('UPDATE users SET salt=?,password=? WHERE id=?').run(salt,digest(pw,salt),u.id);return pub(u);
 },
 createAdmin(name,email,pw){if(!['Elizabeth Torres','Manuel Delgado'].includes(name))fail('Administrador no autorizado');return create(name,email,pw,'admin')},
 register(b){return create(b.name,b.email,b.password,'client')},
 login(b){const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(b.email||'').trim().toLowerCase());const pw=String(b.password||'');if(pw.length>128)fail('Correo o contraseña incorrectos',401);const d=digest(pw,u?.salt||'00000000000000000000000000000000');if(!u||u.password==='pending'||!timingSafeEqual(Buffer.from(d,'hex'),Buffer.from(u.password,'hex')))fail('Correo o contraseña incorrectos',401);return pub(u)},
 session(id){const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),id,csrf,Date.now()+43200000);return {token,csrf}},
 authenticate(t){if(!t||!/^[a-f0-9]{64}$/.test(t))return null;const s=db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(t),Date.now());if(!s)return null;return {user:pub(db.prepare('SELECT * FROM users WHERE id=?').get(s.user_id)),csrf:s.csrf}},
 logout(t){db.prepare('DELETE FROM sessions WHERE token=?').run(hash(t))},
 list(u){return db.prepare(u.role==='admin'?'SELECT data FROM orders':'SELECT data FROM orders WHERE owner=?').all(...(u.role==='admin'?[]:[u.id])).map(r=>{const o=JSON.parse(r.data);if(u.role!=='admin')delete o.history;return o})},get,
 save(u,b,id){const prev=id?get(u,id):null;if(u.role!=='admin'&&prev)fail('Solicita cambios a la vendedora',403);const o={};for(const k of ['name','phone','date','time','street','colony','municipality','notes']){o[k]=String(b[k]||'').trim();if(o[k].length>1000)fail('Texto demasiado largo');if(k!=='notes'&&!o[k])fail('Completa los datos del cliente y evento')}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(o.date)||!Number.isFinite(Date.parse(o.date+'T12:00:00Z'))||new Date(o.date+'T12:00:00Z').toISOString().slice(0,10)!==o.date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(o.time))fail('Fecha u horario inválido');
 for(const k of ['lifetime','samsonite','extraLifetime','extraSamsonite','tables','cloths']){o[k]=b[k];if(!Number.isInteger(o[k])||o[k]>10000)fail('Cantidad inválida')}
 Object.assign(o,u.role==='admin'?{freight:b.freight,deposit:b.deposit,promotion:b.promotion,reason:String(b.reason||'').slice(0,1000),clothChecked:b.clothChecked===true}:{freight:0,deposit:0,promotion:null,reason:'',clothChecked:false});const q=quote(o);if(!(q.tables||q.lifetime||q.samsonite||q.cloths))fail('Agrega productos');if(o.promotion!==null&&!o.reason.trim())fail('Indica motivo de promoción');
 o.colorQuantities={};for(const c of colors){const n=b.colorQuantities?.[c]??0;if(!Number.isInteger(n)||n<0||n>10000)fail('Cantidad de manteles inválida');o.colorQuantities[c]=n}if(Object.values(o.colorQuantities).reduce((a,n)=>a+n,0)!==q.cloths)fail('Revisa cantidades por color');
 o.id=prev?.id||randomUUID();o.version=(prev?.version||0)+1;if(prev&&b.version!==prev.version)fail('El pedido cambió. Recarga antes de editar.',409);
 const keys=['name','phone','date','time','street','colony','municipality','notes','lifetime','samsonite','extraLifetime','extraSamsonite','tables','cloths','freight','promotion','colorQuantities'];const changed=prev&&keys.some(k=>JSON.stringify(prev[k])!==JSON.stringify(o[k]));if(prev&&['Entregado','Devuelto','Cancelado'].includes(prev.status)&&changed)fail('No cambies los detalles de un pedido entregado o cerrado');o.status=prev&&!changed?prev.status:'Por revisar';o.history=prev?.history||[];audit(o,u,prev?'Pedido actualizado':'Solicitud creada');let owner=prev?db.prepare('SELECT owner FROM orders WHERE id=?').get(id).owner:u.role==='client'?u.id:null;if(u.role==='admin'&&b.clientEmail){const client=db.prepare("SELECT id FROM users WHERE email=? AND role='client'").get(String(b.clientEmail).trim().toLowerCase());if(!client)fail('El cliente debe crear su cuenta antes de vincular su correo');if(owner&&owner!==client.id)fail('No se puede cambiar el dueño de un pedido');owner=client.id;o.clientEmail=String(b.clientEmail).trim().toLowerCase()}else if(prev?.clientEmail)o.clientEmail=prev.clientEmail;persist(o,owner);return get(u,o.id)
 },
 action(u,id,b){const o=get(u,id);if(b.version!==o.version)fail('El pedido cambió. Recarga antes de continuar.',409);const admin=u.role==='admin';let status;
 if(b.action==='accept'&&!admin&&o.status==='Cotizado')status='Aceptado por cliente';
 else if(admin&&b.action==='quote'&&o.status==='Por revisar')status='Cotizado';
 else if(admin&&b.action==='confirm'&&o.status==='Aceptado por cliente'){if(!o.clothChecked)fail('Verifica manteles y colores');if(!availability(o,api.list(u)).ok)fail('Inventario insuficiente para estas fechas');status='Confirmado'}
 else if(admin&&b.action==='deliver'&&o.status==='Confirmado')status='Entregado';
 else if(admin&&b.action==='return'&&o.status==='Entregado')status='Devuelto';
 else if(admin&&b.action==='cancel'&&!['Devuelto','Cancelado'].includes(o.status))status='Cancelado';else fail('Acción no permitida',403);
 const owner=db.prepare('SELECT owner FROM orders WHERE id=?').get(id).owner;if(b.action==='quote'&&!owner)fail('Falta vincular una cuenta del cliente a este pedido administrativo');o.status=status;o.version++;o.history=JSON.parse(db.prepare('SELECT data FROM orders WHERE id=?').get(id).data).history;audit(o,u,status);persist(o,owner);return get(u,id)
 }};return api;
}
