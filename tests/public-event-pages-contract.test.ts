import assert from 'node:assert/strict';
import test from 'node:test';
import {publicEventPageQuerySchema,publicEventPageSchema,publicEventReceiptSchema} from '../src/lib/backend/contracts/public-event-pages';
export const publicPage={name:'Evento API',description:'Descrição pública',publicSlug:'event',rules:'Regulamento',earlyDiscountCents:500,earlyDiscountUntil:'2035-01-10T00:00:00.000Z',onlinePaymentEnabled:false,responsibleName:'Contato público',responsiblePhone:'41999990000',arena:{name:'Arena',logoUrl:'',slug:'arena'},categories:[],publicRegistrations:[],categoryBrackets:[]};
export const receipt={leadName:'Atleta',partnerName:'',thirdName:'',amountCents:7500,discountCents:0,status:'PENDING_PAYMENT',paymentStatus:'PENDING',paymentProvider:'MERCADO_PAGO',holdExpiresAt:'2035-01-10T10:00:00.000Z',paymentCheckoutUrl:'https://checkout.example.test',paymentQrCode:'qr',paymentQrCodeBase64:'',tournament:{name:'Evento API'},category:{name:'Day use',registrationType:'INDIVIDUAL',competition:null}};
test('public event query binds a receipt to its supplied event and accepts no caller arena or identity',()=>{
 assert.ok(publicEventPageQuerySchema('page').safeParse({slug:'event'}).success);assert.ok(publicEventPageQuerySchema('receipt').safeParse({slug:'event',registrationId:'r'}).success);assert.equal(publicEventPageQuerySchema('receipt').safeParse({slug:'event'}).success,false);assert.equal(publicEventPageQuerySchema('page').safeParse({slug:'event',registrationId:'r'}).success,false);
 for(const view of ['page','receipt']as const)for(const key of ['arenaId','playerId','accountId','tournamentId'])assert.equal(publicEventPageQuerySchema(view).safeParse({slug:'event',...(view==='receipt'?{registrationId:'r'}:{}),[key]:'foreign'}).success,false);
});
test('public event and receipt DTOs exclude private participant and arena records',()=>{
 assert.ok(publicEventPageSchema.safeParse(publicPage).success);assert.ok(publicEventReceiptSchema.safeParse(receipt).success);
 for(const key of ['leadCpf','leadPhone','leadEmail','mercadoPagoPaymentId','paymentBankAccountId','arenaId'])assert.equal(publicEventReceiptSchema.safeParse({...receipt,[key]:'private'}).success,false);
 assert.equal(publicEventPageSchema.safeParse({...publicPage,arena:{...publicPage.arena,createdById:'private'}}).success,false);assert.equal(publicEventPageSchema.safeParse({...publicPage,publicRegistrations:[{id:'r',categoryId:'c',leadName:'Atleta',partnerName:'',thirdName:'',leadPhone:'private'}]}).success,false);assert.equal(publicEventReceiptSchema.safeParse({...receipt,paymentCheckoutUrl:'javascript:alert(1)'}).success,false);
});
