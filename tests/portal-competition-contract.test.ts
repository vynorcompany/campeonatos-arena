import assert from 'node:assert/strict';
import test from 'node:test';
import {portalCompetitionQuerySchema,doublesRadarSchema,publicSuper12Schema,publicStandingsSchema,publicArenaShellSchema} from '../src/lib/backend/contracts/portal-competition';
import {portalSuper12InputSchema,portalSuper12OutcomeSchema} from '../src/lib/backend/contracts/portal-super12-actions';

test('competition queries reject ownership, unrelated filters and private response fields',()=>{
 for(const view of ['shell','standings','radar','super12'] as const){
  assert.ok(portalCompetitionQuerySchema(view).safeParse({arenaSlug:'arena'}).success);
  for(const key of ['playerId','arenaId','currentPlayerId','accountId'])assert.equal(portalCompetitionQuerySchema(view).safeParse({arenaSlug:'arena',[key]:'foreign'}).success,false);
 }
 assert.equal(portalCompetitionQuerySchema('shell').safeParse({arenaSlug:'arena',eventId:'event'}).success,false);
 assert.equal(portalCompetitionQuerySchema('standings').safeParse({arenaSlug:'arena',athleteId:'athlete'}).success,false);
 assert.ok(portalCompetitionQuerySchema('radar').safeParse({arenaSlug:'arena',athleteId:'selected',category:'5ª'}).success);
 const athlete={id:'a',name:'Athlete',photoUrl:'',gender:'M',categories:['5ª'],padelSide:'',availability:'AVAILABLE'};
 assert.ok(doublesRadarSchema.safeParse({athletes:[athlete],categories:['5ª'],genders:['M'],notifications:[],selectedAthlete:athlete}).success);
 for(const key of ['phone','email','passwordHash'])assert.equal(doublesRadarSchema.safeParse({athletes:[{...athlete,[key]:'private'}],categories:[],genders:[],notifications:[],selectedAthlete:null}).success,false);
 const shell={name:'Arena',slug:'arena',logoUrl:'',athletePortalLogoUrl:'',athletePortalShowLeagues:true,athletePortalShowBooking:true,onlineBookingEnabled:true,athletePortalShowReservations:true,athletePortalShowLessons:true,athletePortalShowClasses:true,athletePortalShowDoublesRadar:true};
 assert.ok(publicArenaShellSchema.safeParse(shell).success);assert.equal(publicArenaShellSchema.safeParse({...shell,id:'private'}).success,false);
 assert.ok(publicStandingsSchema.safeParse({arena:shell,options:[],selectedOptionId:null,selectedTab:'games',leagueRules:[],gameCategories:[],selectedGameCategoryId:null,selectedGameStatus:'ALL',games:[],selected:null}).success);
 assert.equal(publicSuper12Schema.safeParse({events:[],availablePlayers:[{id:'a',name:'A',photoUrl:'',email:'private'}],selectedEvent:null}).success,false);
});

test('Super 12 operations reject forged actors, duplicates and unintended response data',()=>{
 for(const operation of ['create','score','advance','finish'] as const){const schema=portalSuper12InputSchema(operation);assert.ok(schema.safeParse({fields:{arenaSlug:['arena']}}).success);for(const fields of [{arenaSlug:['arena'],creatorId:['foreign']},{arenaSlug:['arena'],playerId:['foreign']},{arenaSlug:['arena','other']},{arenaSlug:['']}])assert.equal(schema.safeParse({fields}).success,false);}
 assert.equal(portalSuper12InputSchema('finish').safeParse({fields:{arenaSlug:['arena'],homeScore:['6']}}).success,false);
 assert.equal(portalSuper12InputSchema('score').safeParse({fields:{arenaSlug:['arena'],homeScore:['6','9']}}).success,false);
 assert.ok(portalSuper12OutcomeSchema.safeParse({error:null,eventId:'own'}).success);
 assert.equal(portalSuper12OutcomeSchema.safeParse({error:null,eventId:'own',passwordHash:'private'}).success,false);
});
