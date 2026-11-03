"use server";
import { requirePermission, requireModuleEdit } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { createQuickPlayerAction } from "@/lib/actions/calendar";
export async function createSmartLookupAction(form:FormData) {
 const kind=String(form.get("kind")||""),name=String(form.get("name")||"").trim();
 if(name.length<2||name.length>120)return{error:"Informe um nome entre 2 e 120 caracteres."};
 if(kind==="client")return createQuickPlayerAction(form);
 try {
  const auth=kind==="product-category"?await requireModuleEdit("stock"):await requirePermission(kind==="tournament-category"?"tournaments:manage":"finance:settings:manage");
  return await withArenaTransaction(auth.arenaId,async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${auth.arenaId+":"+kind+":"+name.toLocaleLowerCase("pt-BR")},0))`;
   if(kind==="supplier"){
    const exists=await tx.supplier.findFirst({where:{arenaId:auth.arenaId,name:{equals:name,mode:"insensitive"}}});
    if(exists)return exists.active?{id:exists.id,name:exists.name}:{error:"Este fornecedor está inativo. Ative o cadastro existente."};
    const supplier=await tx.supplier.create({data:{arenaId:auth.arenaId,name,phone:String(form.get("phone")||""),email:String(form.get("email")||""),document:String(form.get("document")||"")}});return{id:supplier.id,name:supplier.name};
   }
   if(kind==="product-category"){
    const found=await tx.productCategory.findFirst({where:{arenaId:auth.arenaId,name:{equals:name,mode:"insensitive"}}});
    const category=found??await tx.productCategory.create({data:{arenaId:auth.arenaId,name}});return{id:category.id,name:category.name};
   }
   if(kind==="financial-category"){
    const type=String(form.get("financeType")||"BOTH");if(!["REVENUE","EXPENSE","BOTH"].includes(type))throw new Error("Tipo financeiro inválido.");
    const found=await tx.financialCategory.findFirst({where:{arenaId:auth.arenaId,name:{equals:name,mode:"insensitive"}}});
    if(found&&(!found.active||(found.type!==type&&found.type!=="BOTH"&&type!=="BOTH")))throw new Error("Categoria existente com outro tipo ou inativa. Revise o cadastro.");
    const category=found??await tx.financialCategory.create({data:{arenaId:auth.arenaId,name,type}});return{id:category.id,name:category.name};
   }
   if(kind==="tournament-category"){
    const tournamentId=String(form.get("contextId")||"");
    await tx.$queryRaw`SELECT id FROM "Tournament" WHERE id=${tournamentId} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
    const tournament=await tx.tournament.findFirst({where:{id:tournamentId,arenaId:auth.arenaId},include:{categories:{select:{id:true,name:true,level:true}}}});
    if(!tournament)throw new Error("Selecione um torneio desta arena.");
    const found=tournament.categories.find(c=>c.name.toLocaleLowerCase("pt-BR")===name.toLocaleLowerCase("pt-BR"));if(found)return{id:found.id,name:found.name};
    const category=await tx.tournamentCategory.create({data:{tournamentId,name,level:Math.max(0,...tournament.categories.map(c=>c.level))+1,groupCount:tournament.groupCount,pairsPerGroup:tournament.pairsPerGroup,priceFirstCents:tournament.priceFirstCents,priceSecondCents:tournament.priceSecondCents,priceThirdCents:tournament.priceThirdCents}});return{id:category.id,name:category.name};
   }
   throw new Error("Cadastro não disponível neste campo.");
  });
 } catch(error){return{error:error instanceof Error&&!error.name.startsWith("Prisma")?error.message:"Não foi possível criar o cadastro."};}
}
