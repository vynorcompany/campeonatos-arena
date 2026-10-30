import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { portalMenu } from "../src/lib/portal/menu";

const require = createRequire(import.meta.url);
test("o início esconde todos os atalhos de nova reserva sem ocultar as reservas já marcadas", () => {
  const exports: { PortalHome?: React.ComponentType<any> } = {};
  const mocks: Record<string, unknown> = {
    "next/link": { default: ({children,...props}:any) => React.createElement("a",props,children), __esModule:true },
    "./padel-backdrop": { PadelBackdrop: () => null },
    "@/lib/portal/greeting": { getPortalGreeting: () => "Olá" },
    "@/components/portal-rich-text": { PortalRichText: () => null },
    "@/components/client-portal-event-carousel": { ClientPortalEventCarousel: () => null },
    "./portal-navigation": { PortalIcon: () => null, portalCard:"",portalInteractive:"" },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/components/portal/portal-home.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,Date,Intl,Set,require:(name:string)=>name in mocks?mocks[name]:require(name)});
  const base={athletePortalShowBooking:true,athletePortalShowReservations:true,athletePortalShowLessons:false,athletePortalShowClasses:false,athletePortalShowLeagues:false,athletePortalShowDoublesRadar:false};
  const home={financialVisible:false,summary:{mobileFinancialStatus:"normal"},upcomingReservations:[{id:"reservation-a",title:"Reserva já marcada",courtName:"Quadra 1",when:"amanhã"}],announcements:[],charges:[],eventPosts:[]};
  const render=(showBooking:boolean)=>renderToStaticMarkup(React.createElement(exports.PortalHome!,{home,name:"Atleta QA",items:portalMenu({...base,athletePortalShowBooking:showBooking},false),href:(section:string)=>`/portal-qa/${section}`,bookingHref:"/booking-qa"}));
  const enabled=render(true),hidden=render(false);
  assert.match(enabled,/data-portal-booking-cta="true"/);
  assert.match(enabled,/href="\/booking-qa"/);
  assert.doesNotMatch(hidden,/data-portal-booking-cta/);
  assert.doesNotMatch(hidden,/href="\/booking-qa"/);
  assert.doesNotMatch(hidden,/Seu próximo jogo/);
  assert.match(hidden,/Reserva já marcada/);
  assert.match(hidden,/href="\/portal-qa\/reservations"/);
});
