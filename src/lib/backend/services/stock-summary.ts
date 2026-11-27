import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { stockSummaryDataSchema } from '@/lib/backend/contracts/audit-workspace';
export async function resolveStockSummary(arenaId:string){
 const now=new Date();const start=new Date(now.getFullYear(),now.getMonth(),1),end=new Date(now.getFullYear(),now.getMonth()+1,1);
 const[products,sales,movements]=await withArenaTransaction(arenaId,tx=>Promise.all([
  tx.product.findMany({where:{arenaId},orderBy:{name:'asc'},select:{id:true,name:true,stockQuantity:true,priceCents:true}}),
  tx.sale.findMany({where:{arenaId,createdAt:{gte:start,lt:end}},select:{totalCents:true}}),
  tx.stockMovement.findMany({where:{arenaId,createdAt:{gte:start,lt:end}},orderBy:{createdAt:'desc'},take:30,select:{id:true,productId:true,type:true,quantity:true,reason:true}})
 ]));const names=new Map(products.map(product=>[product.id,product.name]));
 return stockSummaryDataSchema.parse({pdvRevenueCents:sales.reduce((sum,row)=>sum+row.totalCents,0),stockValueCents:products.reduce((sum,row)=>sum+row.stockQuantity*row.priceCents,0),productCount:products.length,movements:movements.map(({productId,...row})=>({...row,productName:names.get(productId)??'Produto indisponível'}))});
}
