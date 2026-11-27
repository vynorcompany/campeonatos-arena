import { createForeignArenaFixture } from './backend-foreign-fixtures.mjs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
export function syntheticNfeXml(key, items) {
  return `<NFe><infNFe Id="NFe${key}"><ide><nNF>123</nNF><serie>1</serie><dhEmi>2026-11-01T10:00:00-03:00</dhEmi></ide><emit><xNome>Fornecedor sintético NF-e</xNome><CNPJ>00000000000000</CNPJ></emit>${items.map((row,index)=>`<det nItem="${index+1}"><prod><cProd>${row.code}</cProd><cEAN>7890000000000</cEAN><NCM>22011000</NCM><CFOP>5102</CFOP><uCom>UN</uCom><xProd>${row.name}</xProd><qCom>${row.quantity}</qCom><vUnCom>2.50</vUnCom><vProd>${(row.quantity*2.5).toFixed(2)}</vProd></prod></det>`).join('')}<total><ICMSTot><vNF>${items.reduce((sum,row)=>sum+row.quantity*2.5,0).toFixed(2)}</vNF></ICMSTot></total></infNFe></NFe>`;
}
export async function assertNfeSmoke(db, origin, arenaId, cookie, staffId) {
  const post=(operation,payload,requestOrigin='http://127.0.0.1:3014')=>fetch(`${origin}/api/management/products/nfe/${operation}`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(payload)});
  const key=randomUUID().replace(/-/g,'').replace(/[a-f]/g,'1').padEnd(44,'0');
  const rows=[{code:'NFE-EXIST',name:'Produto existente NF-e',quantity:3},{code:'NFE-NEW',name:'Produto novo NF-e',quantity:2}];
  const xml=syntheticNfeXml(key,rows);const file={name:'entrada.xml',type:'text/xml',data:Buffer.from(xml).toString('base64')};
  const member=await db.arenaMember.findFirstOrThrow({where:{arenaId,userId:staffId}});
  assert.equal((await post('preview',{file})).status,403);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:[...member.editPermissions,'stock']}});
  const existing=await db.product.create({data:{arenaId,name:rows[0].name,sku:rows[0].code,stockQuantity:10,priceCents:500,costCents:200}});
  assert.equal((await post('preview',{file},'https://foreign.invalid')).status,403);
  assert.equal((await post('preview',{file,arenaId:'forged'})).status,400);
  const previewResponse=await post('preview',{file});assert.equal(previewResponse.status,200);assert.equal(previewResponse.headers.get('cache-control'),'private, no-store');const preview=await previewResponse.json();assert.equal(preview.invoice.items.length,2);assert.ok(preview.products.some(row=>row.id===existing.id));for(const field of ['accessKey','supplierDocument','digest','arenaId'])assert.equal(JSON.stringify(preview).includes(field),false);
  const max=5*1024*1024;const padded=xml+'<!--'+'x'.repeat(max-Buffer.byteLength(xml)-7)+'-->';assert.equal(Buffer.byteLength(padded),max);assert.equal((await post('preview',{file:{...file,data:Buffer.from(padded).toString('base64')}})).status,200,'Exactly 5 MiB XML must remain supported');
  assert.equal((await post('preview',{file:{...file,data:Buffer.from(padded+'x').toString('base64')}})).status,400);
  assert.equal((await post('preview',{file:{...file,data:Buffer.from('<!DOCTYPE x>'+xml).toString('base64')}})).status,400);
  assert.equal((await post('preview',{file:{...file,data:'!!!!'}})).status,400);
  const mappings=rows.map((row,index)=>({index,productId:index===0?existing.id:'',name:row.name,sku:row.code,costCents:250,priceCents:index===0?0:750}));
  assert.equal((await post('import',{file,items:[mappings[0],mappings[0]]})).status,400);
  assert.equal((await post('import',{file,items:[mappings[0]]})).status,400);
  const other=await createForeignArenaFixture(db, 'nfe');const foreign=await db.product.create({data:{arenaId:other.id,name:'Foreign NFE fixture '+randomUUID(),stockQuantity:7}});
  try { assert.equal((await post('import',{file,items:[mappings[0],{...mappings[1],productId:foreign.id}]})).status,400);assert.equal((await db.product.findUniqueOrThrow({where:{id:existing.id}})).stockQuantity,10);assert.equal((await db.product.findUniqueOrThrow({where:{id:foreign.id}})).stockQuantity,7);assert.equal(await db.fiscalDocument.count({where:{arenaId,accessKey:key}}),0); } finally { await db.product.delete({where:{id:foreign.id}}); }
  const responses=await Promise.all([post('import',{file,items:mappings}),post('import',{file,items:mappings})]);assert.deepEqual(responses.map(row=>row.status).sort(),[200,400]);for(const response of responses)if(response.status===200)assert.deepEqual(await response.json(),{createdProducts:1,updatedProducts:1,importedItems:2});
  const updated=await db.product.findUniqueOrThrow({where:{id:existing.id}});assert.equal(updated.stockQuantity,13);assert.equal(updated.priceCents,500);assert.equal(updated.costCents,250);assert.equal(updated.updatedByUserId,staffId);
  const created=await db.product.findFirstOrThrow({where:{arenaId,sku:rows[1].code}});assert.equal(created.stockQuantity,2);assert.equal(created.priceCents,750);assert.equal(created.createdByUserId,staffId);assert.equal(await db.product.count({where:{arenaId,sku:rows[1].code}}),1);
  const invoice=await db.fiscalDocument.findFirstOrThrow({where:{arenaId,accessKey:key},include:{items:true}});assert.equal(invoice.items.length,2);assert.equal(invoice.status,'IMPORTED');assert.equal(invoice.xmlDigest,createHash('sha256').update(xml).digest('hex'));assert.equal(invoice.supplierDocument,'00000000000000');assert.equal(invoice.issuedAt.toISOString(),'2026-11-01T13:00:00.000Z');assert.equal(invoice.totalCents,1250);assert.ok(invoice.items.every(item=>item.barcode==='7890000000000'&&item.ncm==='22011000'&&item.cfop==='5102'&&item.unit==='UN'));assert.equal(await db.stockMovement.count({where:{arenaId,productId:{in:[existing.id,created.id]}}}),2);
  assert.equal((await post('preview',{file})).status,400);assert.equal((await post('import',{file,items:mappings})).status,400);assert.equal((await db.product.findUniqueOrThrow({where:{id:existing.id}})).stockQuantity,13);
  const autoXml=syntheticNfeXml(key.slice(0,-1)+'1',[{...rows[0],quantity:2}]);assert.equal((await post('import',{file:{...file,data:Buffer.from(autoXml).toString('base64')},items:[]})).status,200);assert.equal((await db.product.findUniqueOrThrow({where:{id:existing.id}})).stockQuantity,15);
  await db.arenaMember.update({where:{id:member.id},data:{editPermissions:member.editPermissions}});
}
