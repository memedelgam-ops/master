export const colors=['Guindo','Negro','Blanco','Blanco de rayas','Dorado','Rojo','Azul Marino','Azul Celeste','Verde','Rosa Bebé','Rosa Viejo','Rosa de rayas','Rosa Pretty'];
export function quote(o){
 const counts=['lifetime','samsonite','extraLifetime','extraSamsonite','tables','cloths'];
 for(const key of counts)if(!Number.isInteger(o[key])||o[key]<0)throw Error('Las cantidades deben ser enteros positivos o cero');
 const subtotal=o.lifetime*275+o.samsonite*175+o.extraLifetime*25+o.extraSamsonite*15+(o.tables+o.cloths)*80;
 const automatic=o.colony.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='jardines de san patricio'?o.lifetime*25+o.samsonite*15:0;
 const discount=o.promotion===null?automatic:o.promotion;
 if(!Number.isFinite(discount)||discount<0||discount>subtotal)throw Error('La promoción debe estar entre cero y el subtotal');
 if(!Number.isFinite(o.freight)||o.freight<0||!Number.isFinite(o.deposit)||o.deposit<0)throw Error('Revisa flete y anticipo');
 const total=subtotal-discount+o.freight;
 if(o.deposit>total)throw Error('El anticipo no puede superar el total');
 return {subtotal,discount,total,balance:total-o.deposit,tables:o.lifetime+o.samsonite+o.tables,lifetime:o.lifetime*10+o.extraLifetime,samsonite:o.samsonite*10+o.extraSamsonite,cloths:o.lifetime+o.samsonite+o.cloths};
}
export function availability(order,orders){
 const end=d=>{const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+1);return t.toISOString().slice(0,10)};
 const active=orders.filter(o=>o.id!==order.id&&['Confirmado','Entregado'].includes(o.status)&&o.date<=end(order.date)&&end(o.date)>=order.date);
 const used=active.reduce((a,o)=>{const q=quote(o);for(const k of ['tables','lifetime','samsonite'])a[k]+=q[k];return a;},{tables:0,lifetime:0,samsonite:0});
 const q=quote(order);return {ok:used.tables+q.tables<=23&&used.lifetime+q.lifetime<=110&&used.samsonite+q.samsonite<=120,used};
}
