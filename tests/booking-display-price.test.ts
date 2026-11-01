import assert from "node:assert/strict";
import test from "node:test";
import { initialBookingAmount } from "../src/lib/calendar/booking-display-price";
const slot={startsAt:"17:00",endsAt:"18:30",dateValue:"2026-11-01",pricingIntervalMinutes:30,pricingRules:[{weekday:0,startsAtMinute:420,endsAtMinute:1380,priceCents:6000,available:true}],participants:[{amountCents:0}]};
test("booking display retains stored prices, deliberate zero and legacy unpaid tariffs",()=>{
 assert.equal(initialBookingAmount(slot),18000);
 assert.equal(initialBookingAmount({...slot,priceCents:12500}),12500);
 assert.equal(initialBookingAmount({...slot,priceCents:0}),0);
 assert.equal(initialBookingAmount({...slot,participants:[{amountCents:9000}]}),9000);
 assert.equal(initialBookingAmount({...slot,services:[{priceCents:2500}]}),20500);
 assert.equal(initialBookingAmount({...slot,bookingTypeName:"Liga"},{LEAGUE:5000}),0);
 assert.equal(initialBookingAmount({...slot,pricingIntervalMinutes:15,endsAt:"17:30"}),12000);
});
