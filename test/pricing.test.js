import test from 'node:test';
import assert from 'node:assert/strict';
import {quote,availability} from '../public/pricing.js';
const base={lifetime:1,samsonite:1,extraLifetime:0,extraSamsonite:0,tables:0,cloths:0,colony:'Otra',promotion:null,freight:0,deposit:0,date:'2026-12-10'};
test('tarifas y descuento por paquete',()=>{assert.equal(quote(base).total,450);assert.equal(quote({...base,colony:' Jardines de San Patricio '}).total,410);assert.equal(quote({...base,extraLifetime:1,extraSamsonite:1,tables:1,cloths:1,freight:100,deposit:50}).balance,700)});
test('promoción manual sustituye automática y cero la elimina',()=>{assert.equal(quote({...base,colony:'Jardines de San Patricio',promotion:0}).total,450);assert.equal(quote({...base,promotion:50}).total,400);assert.throws(()=>quote({...base,promotion:451}));assert.throws(()=>quote({...base,deposit:451}));assert.throws(()=>quote({...base,lifetime:1.5}));});
test('inventario compartido y ocupación al día siguiente',()=>{const existing={...base,id:'1',lifetime:11,samsonite:12,status:'Confirmado'};assert.equal(availability({...base,date:'2026-12-11'},[existing]).ok,false);assert.equal(availability({...base,date:'2026-12-12'},[existing]).ok,true);assert.equal(availability(base,[{...existing,status:'Cancelado'}]).ok,true)});
