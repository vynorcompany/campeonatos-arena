import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { dateOnly } from "./plan-transfer-calculation";
export function academyToday(now = new Date()) {
  const local = instantToArenaWallClock(now);
  return dateOnly(`${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`);
}
