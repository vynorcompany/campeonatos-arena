import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error operational ESM
import {shouldReportProbeFailure} from "../services/recovery/monitor.mjs";
test("a transient probe failure does not claim WAL failure; a sustained loss still alerts",()=>{
 const now=Date.parse("2030-01-01T12:00:00Z");
 assert.equal(shouldReportProbeFailure(1,"2030-01-01T11:00:00Z",now),false);
 assert.equal(shouldReportProbeFailure(3,"2030-01-01T11:55:00Z",now),false);
 assert.equal(shouldReportProbeFailure(3,"2030-01-01T11:45:00Z",now),true);
 assert.equal(shouldReportProbeFailure(10,"invalid",now),false);
});
