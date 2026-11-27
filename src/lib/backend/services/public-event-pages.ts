import "server-only";
import {prisma} from "@/lib/prisma";
import {arenaDatabase} from "@/lib/arena-database";
import {publicEventPageSchema,publicEventReceiptSchema} from "../contracts/public-event-pages";
export async function resolvePublicEventPage(slug:string){
  const [tournamentOwner] = await prisma.$queryRaw<{ id: string; arenaId: string }[]>`SELECT * FROM public.resolve_tournament_public_slug(${slug})`;
  if (!tournamentOwner) return null;
  const tournament = await arenaDatabase(tournamentOwner.arenaId).tournament.findUnique({
    where: { publicSlug: slug, arenaId: tournamentOwner.arenaId },
    select: {
      name:true,description:true,publicSlug:true,rules:true,earlyDiscountCents:true,earlyDiscountUntil:true,onlinePaymentEnabled:true,responsibleName:true,responsiblePhone:true,
      arena: { select: { name: true, logoUrl: true, slug: true } },
      categories: { where: { active: true, archivedAt: null }, orderBy: { level: "asc" }, select: { id:true,name:true,registrationType:true,priceFirstCents:true,priceSecondCents:true,priceThirdCents:true,competition: { select: { format: true, status: true, isPublic: true, pairs: { where: { active: true, competition: { format: "TRIO", isPublic: true, status: { in: ["PUBLISHED", "FINISHED"] } } }, orderBy: { drawOrder: "asc" }, select: { id: true, name: true, players: { orderBy: { slot: "asc" }, select: { player: { select: { id: true, name: true } } } } } }, matches: { where: { competition: { format: "TRIO", isPublic: true, status: { in: ["PUBLISHED", "FINISHED"] } } }, orderBy: { roundOrder: "asc" }, select: { id: true, label: true, stage: true, scheduledTime: true, courtName: true, homeScore: true, awayScore: true, homePair: { select: { name: true, players: { select: { player: { select: { id: true, name: true } } } } } }, awayPair: { select: { name: true, players: { select: { player: { select: { id: true, name: true } } } } } }, trioGames: { orderBy: { gameNumber: "asc" }, select: { gameNumber: true, homePlayerIds: true, awayPlayerIds: true, homeScore: true, awayScore: true } } } } } } } },
      publicRegistrations: {
        where: { status: "CONFIRMED", category: { tournamentId: tournamentOwner.id } },
        orderBy: [{ registrationOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, leadName: true, partnerName: true, thirdName: true, categoryId: true },
      },
      categoryBrackets: {
        where: { category: { archivedAt: null, tournamentId: tournamentOwner.id } },
        select: {
          id:true,
          category: { select: { name: true } },
          matches: {
            orderBy: [{ roundOrder: "asc" }, { label: "asc" }],
            select: {
              id:true,label:true,scheduledTime:true,courtName:true,
              homeRegistration: { select: { leadName: true, partnerName: true, thirdName: true } },
              awayRegistration: { select: { leadName: true, partnerName: true, thirdName: true } },
              winnerRegistration: { select: { leadName: true, partnerName: true, thirdName: true } },
            },
          },
        },
      },
    },
  });

 return publicEventPageSchema.parse(tournament?{...tournament,earlyDiscountUntil:tournament.earlyDiscountUntil?.toISOString()??null}:null);
}
export async function resolvePublicEventReceipt(slug:string,registrationId:string){
 const [owner]=await prisma.$queryRaw<{id:string;arenaId:string}[]>`SELECT * FROM public.resolve_tournament_public_slug(${slug})`;
 if(!owner)return null;
 const registration=await arenaDatabase(owner.arenaId).publicTournamentRegistration.findFirst({where:{id:registrationId,tournamentId:owner.id,category:{tournamentId:owner.id}},select:{leadName:true,partnerName:true,thirdName:true,amountCents:true,discountCents:true,status:true,paymentStatus:true,paymentProvider:true,holdExpiresAt:true,paymentCheckoutUrl:true,paymentQrCode:true,paymentQrCodeBase64:true,tournament:{select:{name:true}},category:{select:{name:true,registrationType:true,competition:{select:{format:true}}}}}});
 if(!registration)return null;
 const confirmed=registration.status==="CONFIRMED"||registration.paymentStatus==="PAID",review=registration.paymentStatus==="REVIEW",canceled=registration.status==="CANCELED"||registration.paymentStatus==="REFUNDED",onsite=registration.paymentProvider==="PAY_ON_SITE"&&registration.paymentStatus!=="PAID";
 const expired=!confirmed&&!review&&!canceled&&Boolean(registration.holdExpiresAt&&registration.holdExpiresAt<=new Date());
 const payable=!confirmed&&!review&&!canceled&&!onsite&&!expired;
 return publicEventReceiptSchema.parse({...registration,holdExpiresAt:registration.holdExpiresAt?.toISOString()??null,paymentCheckoutUrl:payable?registration.paymentCheckoutUrl:"",paymentQrCode:payable?registration.paymentQrCode:"",paymentQrCodeBase64:payable?registration.paymentQrCodeBase64:""});
}
