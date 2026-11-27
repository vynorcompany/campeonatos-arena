import assert from 'node:assert/strict';
import test from 'node:test';
import {portalLeagueQuerySchema,portalLeagueSchema,decodePortalLeague} from '../src/lib/backend/contracts/portal-league';
test('personal league query accepts category selection and refuses supplied identity',()=>{
 assert.ok(portalLeagueQuerySchema.safeParse({arenaSlug:'arena',categoryId:'category'}).success);
 for(const key of ['playerId','teacherId','studentId','arenaId','accountId'])assert.equal(portalLeagueQuerySchema.safeParse({arenaSlug:'arena',[key]:'other'}).success,false);
 assert.equal(portalLeagueQuerySchema.safeParse({arenaSlug:''}).success,false);
});
test('personal league DTO refuses arbitrary records and preserves dates through decoding',()=>{
 assert.equal(portalLeagueSchema.safeParse({playerId:'a',arenaSlug:'arena',passwordHash:'secret'}).success,false);
 assert.equal(decodePortalLeague(null),null);
 const wire={playerId:'own',arenaSlug:'arena',makeupEnabled:true,leagueCategories:[],selectedLeagueCategoryId:null,selectedLeagueFormat:null,selectedEventRules:null,selectedLeaguePairs:[],leagueResults:[],pairs:[],challenges:[],leagueNotifications:[{id:'n',title:'Own',message:'Message',href:'/home',createdAt:'2035-01-10T10:00:00.000Z'}],slots:[],replacementPlayers:[],prizes:[],reservations:[],lessons:[],teachers:[],classes:[],classGroups:[],student:null,teacherManagement:null};
 const decoded=decodePortalLeague(portalLeagueSchema.parse(wire));assert.equal(decoded?.leagueNotifications[0].createdAt.toISOString(),wire.leagueNotifications[0].createdAt);
 assert.equal(portalLeagueSchema.safeParse({...wire,leagueNotifications:[{...wire.leagueNotifications[0],phone:'private'}]}).success,false);
 assert.equal(portalLeagueSchema.safeParse({...wire,teacherManagement:{passwordHash:'private'}}).success,false);
});
