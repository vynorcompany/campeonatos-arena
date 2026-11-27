import assert from 'node:assert/strict';
import test from 'node:test';
import {portalClientQuerySchema,portalHomeSchema,portalComandasSchema,portalFinanceSchema} from '../src/lib/backend/contracts/portal-client';

test('private Portal queries reject caller-supplied ownership and malformed catalog switches',()=>{
 for(const field of ['playerId','arenaId','accountId','guardianId'])assert.equal(portalClientQuerySchema.safeParse({arenaSlug:'arena',[field]:'foreign'}).success,false);
 for(const catalog of ['yes','0','FALSE'])assert.equal(portalClientQuerySchema.safeParse({arenaSlug:'arena',catalog}).success,false);
 assert.ok(portalClientQuerySchema.safeParse({arenaSlug:'arena',catalog:'false'}).success);
 assert.equal(portalClientQuerySchema.safeParse({arenaSlug:''}).success,false);
});

test('Portal DTOs cannot carry provider secrets or raw private records',()=>{
 const home={financialVisible:true,announcements:[],events:[],eventPosts:[{id:'post',title:'Public',caption:'',imageUrl:'/image.svg',linkUrl:null,pinned:false}],charges:[],upcomingReservations:[],summary:{financial:'Em dia',futureFinancial:null,financialStatus:'active',mobileFinancialStatus:'healthy',mobileFinancialLabel:'Tudo em dia',classes:0,reservations:0,leagues:0}};
 assert.ok(portalHomeSchema.safeParse(home).success);
 assert.equal(portalHomeSchema.safeParse({...home,passwordHash:'private'}).success,false);
 assert.equal(portalHomeSchema.safeParse({...home,events:[{id:'event',title:'Event',notes:'Public',scheduledAt:'2035-01-01T12:00:00.000Z',when:'01/01',arenaId:'private'}]}).success,false);
 const catalog={disabled:false,comandas:[],categories:[],products:[{id:'product',name:'Café',priceCents:500,stockQuantity:2,category:'Bebidas',composition:{fixed:[],groups:[{id:'milk',label:'Leite',options:[{productId:'ingredient',name:'Leite',quantity:1,available:true}]}]}}]};
 assert.ok(portalComandasSchema.safeParse(catalog).success);
 for(const field of ['costCents','stockAggregates','notes'])assert.equal(portalComandasSchema.safeParse({...catalog,products:[{...catalog.products[0],[field]:'private'}]}).success,false);
 assert.equal(portalComandasSchema.safeParse({...catalog,comandas:[{id:'tab',passwordHash:'private'}]}).success,false);
 assert.ok(portalFinanceSchema.safeParse({disabled:true,paymentEnabled:false,health:'healthy',headline:'Consulta indisponível',detail:'',overdue:[],open:[],paid:[],comandas:[]}).success);
});
