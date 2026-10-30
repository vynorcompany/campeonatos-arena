import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { saveStockAggregates, consumeProductStock, stockDemand } from "../src/lib/products/stock-aggregates";
import { decorateCompositions, resolveComposition } from "../src/lib/products/composition";
import { submitPortalOrder, confirmPortalOrderItem, appendComandaProduct } from "../src/lib/comandas/portal-orders";
const url=process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
test("escolhas gerais são obrigatórias, isoladas e preservadas por variante do pedido até a baixa fiscal",{skip:!/^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url)},async()=>{
 const db=new PrismaClient({datasources:{db:{url}}});const arenas:string[]=[];
 try{
 const user=await db.user.findFirstOrThrow();const arena=await db.arena.create({data:{createdById:user.id,name:"Composição QA",slug:`choice-${randomUUID()}`}});arenas.push(arena.id);
 const foreign=await db.arena.create({data:{createdById:user.id,name:"Outra QA",slug:`choice-${randomUUID()}`}});arenas.push(foreign.id);
 const player=await db.player.create({data:{arenaId:arena.id,name:"Cliente QA"}});
 const products=await Promise.all(["Opção A","Opção B","Agregado fixo","Produto composto"].map(name=>db.product.create({data:{arenaId:arena.id,name,stockQuantity:20,priceCents:2500}})));
 const [a,b,fixed,parent]=products;const outside=await db.product.create({data:{arenaId:foreign.id,name:"Fora",stockQuantity:20}});
 const tx=<T>(operation:(c:Prisma.TransactionClient)=>Promise<T>)=>db.$transaction(async c=>{await c.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");await c.$executeRaw`SELECT set_config('app.arena_id',${arena.id},true)`;return operation(c)});
 const groups=[{id:"acompanhamento",label:"Acompanhamento",options:[{productId:a.id,quantity:1},{productId:b.id,quantity:2}]}];
 await assert.rejects(tx(c=>saveStockAggregates(c,arena.id,parent.id,[],[{...groups[0],options:[groups[0].options[0],{productId:outside.id,quantity:1}]}])),/desta arena/);
 await tx(c=>saveStockAggregates(c,arena.id,parent.id,[{productId:fixed.id,quantity:1}],groups));
 const configured=await db.product.findUniqueOrThrow({where:{id:parent.id}});
 await assert.rejects(tx(c=>resolveComposition(c,arena.id,configured,{})),/Escolha/);
 await assert.rejects(tx(c=>resolveComposition(c,arena.id,configured,{acompanhamento:outside.id})),/Escolha/);
 const [display]=await tx(c=>decorateCompositions(c,arena.id,[configured]));assert.equal(display.composition.fixed[0].name,"Agregado fixo");assert.equal(display.composition.groups[0].options.length,2);
 const command=await db.comanda.create({data:{arenaId:arena.id,playerId:player.id,label:player.name,code:randomUUID()}});
 await assert.rejects(tx(c=>appendComandaProduct(c,arena.id,{comandaId:command.id,productId:parent.id,quantity:1,durationMinutes:60})),/Escolha/);
 const input={arenaId:arena.id,playerId:player.id,comandaId:command.id,orderId:randomUUID(),items:[{productId:parent.id,quantity:2,choices:{acompanhamento:a.id}},{productId:parent.id,quantity:1,choices:{acompanhamento:b.id}}]};
 await tx(c=>submitPortalOrder(c,input));assert.equal((await tx(c=>submitPortalOrder(c,input))).replayed,true);
 const requests=await db.comandaRequest.findMany({where:{comandaId:command.id}});assert.equal(requests.length,2);
 // Changing the recipe after the request does not change the chosen quantities.
 await tx(c=>saveStockAggregates(c,arena.id,parent.id,[],[{...groups[0],options:[{productId:a.id,quantity:4},{productId:b.id,quantity:5}]}]));
 for(const request of requests)await Promise.all([tx(c=>confirmPortalOrderItem(c,arena.id,request.id)),tx(c=>confirmPortalOrderItem(c,arena.id,request.id))]);
 const items=await db.comandaItem.findMany({where:{comandaId:command.id}});assert.equal(items.length,2);assert.equal(new Set(items.map(row=>row.variantKey)).size,2);assert.ok(items.some(row=>row.compositionLabel.includes("Opção B")));
 const sale=await db.sale.create({data:{arenaId:arena.id,code:randomUUID(),paymentMethod:"PIX",totalCents:7500,items:{create:items.map(item=>({productId:item.productId,quantity:item.quantity,unitPriceCents:item.unitPriceCents,totalCents:item.totalCents,variantKey:item.variantKey,stockRecipe:item.stockRecipe!,compositionLabel:item.compositionLabel}))}}});
 await tx(c=>consumeProductStock(c,arena.id,items,"Escolhas QA",sale.id));await tx(c=>consumeProductStock(c,arena.id,items,"Repetido",sale.id));
 const balances=await db.product.findMany({where:{id:{in:products.map(row=>row.id)}}});const stock=(id:string)=>balances.find(row=>row.id===id)!.stockQuantity;
 assert.equal(stock(a.id),18);assert.equal(stock(b.id),18);assert.equal(stock(fixed.id),17);assert.equal(stock(parent.id),17);
 assert.equal(await db.stockMovement.count({where:{arenaId:arena.id}}),4);
 assert.equal((await db.sale.findUniqueOrThrow({where:{id:sale.id}})).totalCents,7500);
 await db.product.update({where:{id:b.id},data:{stockQuantity:0}});
 const updated=await db.product.findUniqueOrThrow({where:{id:parent.id}});const [unavailable]=await tx(c=>decorateCompositions(c,arena.id,[updated]));assert.equal(unavailable.composition.groups[0].options.find(row=>row.productId===b.id)?.available,false);
 await assert.rejects(tx(c=>submitPortalOrder(c,{...input,orderId:randomUUID(),items:[{productId:parent.id,quantity:1,choices:{acompanhamento:b.id}}]})),/indisponível/);
 }finally{for(const arenaId of arenas){await db.arenaNotification.deleteMany({where:{arenaId}});await db.sale.deleteMany({where:{arenaId}});await db.comanda.deleteMany({where:{arenaId}});await db.stockMovement.deleteMany({where:{arenaId}});await db.product.deleteMany({where:{arenaId}});await db.player.deleteMany({where:{arenaId}});await db.arena.delete({where:{id:arenaId}})}await db.$disconnect()}
});

test("ingredientes repetidos entre grupos somam sem herdar o limite de uma linha do cadastro",()=>{
 const demand=stockDemand([{id:"principal",stockAggregates:[]}],[{productId:"principal",quantity:2,stockRecipe:[{productId:"ingrediente",quantity:1000}]}]);
 assert.equal(demand.get("ingrediente"),2000);
});
