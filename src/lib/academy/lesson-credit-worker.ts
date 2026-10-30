import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { lessonCreditState } from "./lesson-credits";
import { playerLessonCredits } from "./lesson-credit-portal";
export async function maintainLessonCredits(now=new Date()) {
 let failed=0;
 const arenas=await prisma.arena.findMany({select:{id:true,slug:true}});
 for(const arena of arenas){
  const students=await withArenaTransaction(arena.id,tx=>tx.student.findMany({where:{arenaId:arena.id,active:true},select:{id:true,playerId:true}}));
  for(const student of students)try{await withArenaTransaction(arena.id,async tx=>{if(student.playerId)await playerLessonCredits(tx,arena.id,student.playerId,arena.slug,now);else await lessonCreditState(tx,arena.id,student.id,now);});}catch{failed++;console.error("Lesson credit maintenance failed",{arenaId:arena.id,studentId:student.id});}
 }
 return {failed};
}
let started=false;
export function startLessonCreditWorker(){
 if(started)return;started=true;let running=false,lastDay="";
 const tick=async()=>{const local=instantToArenaWallClock(new Date());const day=`${local.getFullYear()}-${local.getMonth()}-${local.getDate()}`;if(running||day===lastDay)return;running=true;try{if(!(await maintainLessonCredits()).failed)lastDay=day;}catch{console.error("Lesson credit maintenance unavailable");}finally{running=false;}};
 void tick();setInterval(()=>void tick(),60000).unref();
}
