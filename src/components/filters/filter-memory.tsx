"use client";
import { createContext, Suspense, useContext, useEffect, useRef, useState, type ReactNode, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { rememberedFilterKeys, rememberedFilterQuery } from "@/lib/navigation/filter-memory";
const Scope = createContext("");
export function FilterMemoryProvider({scope,queryMemory=false,children}:{scope:string;queryMemory?:boolean;children:ReactNode}) {
  return <Scope.Provider value={scope}>{queryMemory ? <Suspense fallback={null}><QueryMemory scope={scope}/></Suspense> : null}{children}</Scope.Provider>;
}
export function useFilterMemory<T>(key:string, initial:T) {
  const scope=useContext(Scope), storageKey=`filters:v1:${scope}:${key}`;
  const [value,setValue]=useState(initial), loaded=useRef("");
  useEffect(()=>{loaded.current=storageKey;setValue(initial);if(!scope)return;try{const saved=localStorage.getItem(storageKey);if(saved!==null){const next=JSON.parse(saved);if(typeof next===typeof initial)setValue(next);}}catch{}},[storageKey]);
  const update=(next:SetStateAction<T>)=>setValue(current=>{const resolved=typeof next==="function"?(next as (v:T)=>T)(current):next;if(scope&&loaded.current===storageKey)try{localStorage.setItem(storageKey,JSON.stringify(resolved));}catch{}return resolved;});
  return [value,update] as const;
}
function QueryMemory({scope}:{scope:string}) {
 const path=usePathname()??"/", search=useSearchParams(), router=useRouter();
 const raw=search?.toString()??"";
 useEffect(()=>{
   if(!scope || path==="/torneios")return;
   const key=`filters:v1:${scope}:route:${path}`;
   try {if(raw){if([...new URLSearchParams(raw).keys()].some(key=>rememberedFilterKeys.has(key)))localStorage.setItem(key,rememberedFilterQuery(raw));}else{const saved=localStorage.getItem(key);if(saved&&rememberedFilterQuery(saved)===saved)router.replace(`${path}?${saved}`,{scroll:false});}}catch{}
 },[scope,path,raw,router]);
 useEffect(()=>{const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
   if(!link||link.download||link.target&&link.target!=="_self"||link.dataset.resetFilters!==undefined)return;
   const url=new URL(link.href);if(url.origin!==location.origin||url.search||url.hash||!url.pathname.startsWith("/")||url.pathname===path||url.pathname==="/torneios")return;
   try{const saved=localStorage.getItem(`filters:v1:${scope}:route:${url.pathname}`);if(saved&&rememberedFilterQuery(saved)===saved){event.preventDefault();router.push(`${url.pathname}?${saved}`);}}catch{}
 };document.addEventListener("click",click,true);return()=>document.removeEventListener("click",click,true);},[scope,path,router]);
 return null;
}
