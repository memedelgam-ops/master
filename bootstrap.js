import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {createStore} from './store.js';
const path=process.env.LIZZY_DB_PATH||'/workspace/lizzy-data/app.sqlite';
mkdirSync(dirname(path),{recursive:true,mode:0o700});
const store=createStore(path);
try{
 store.reserveAdmin('Elizabeth Torres','meme.delgam@icloud.com');
 store.reserveAdmin('Manuel Delgado','memedelgam@gmail.com');
 chmodSync(path,0o600);
 console.log('Base de datos preparada; cuentas administrativas preservadas.');
}finally{store.db.close()}
