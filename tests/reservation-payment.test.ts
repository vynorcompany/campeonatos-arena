import assert from "node:assert/strict";
import test from "node:test";
import { isReservationChargePaid } from "../src/lib/finance/reservation-payment";

test("reservation payment indicator requires the holder and all assigned parts to be paid",()=>{
 assert.equal(isReservationChargePaid(null),false);
 assert.equal(isReservationChargePaid({status:"PENDING",reservationSplitParts:[]}),false);
 assert.equal(isReservationChargePaid({status:"PAID",reservationSplitParts:[]}),true);
 assert.equal(isReservationChargePaid({status:"PAID",reservationSplitParts:[{status:"PAID"},{status:"PENDING"}]}),false);
 assert.equal(isReservationChargePaid({status:"PAID",reservationSplitParts:[{status:"PARTIAL"}]}),false);
 assert.equal(isReservationChargePaid({status:"PAID",reservationSplitParts:[{status:"PAID"},{status:"PAID"}]}),true);
});
