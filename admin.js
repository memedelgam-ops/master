import {createStore} from './store.js';
import {readFileSync} from 'node:fs';
const [identity,email]=process.argv.slice(2),name={elizabeth:'Elizabeth Torres',manuel:'Manuel Delgado'}[identity];
if(!name||!email){console.error('Uso: node admin.js elizabeth|manuel correo < contraseña_por_stdin');process.exit(1)}
try{const s=createStore(process.env.LIZZY_DB_PATH||'/workspace/lizzy-data/app.sqlite');s.activateAdmin(name,email,readFileSync(0,'utf8').replace(/\r?\n$/,''));s.db.close();console.log('Cuenta administrativa activada.')}catch(e){console.error(e.message);process.exit(1)}
