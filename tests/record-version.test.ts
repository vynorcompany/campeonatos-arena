import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRecordVersion, expectedRecordDate, recordVersion, StaleRecordError } from '../src/lib/record-version';
test('stale or missing versions cannot overwrite records, including older clients',()=>{
 const current=recordVersion(new Date('2026-11-02T12:00:00.123Z'));
 assertRecordVersion(current,current);
 for(const expected of [undefined,null,'NEW','2026-11-02T11:00:00.123Z'])assert.throws(()=>assertRecordVersion(current,expected),StaleRecordError);
 assert.equal(expectedRecordDate('invalid'),null);assert.equal(expectedRecordDate(current)?.toISOString(),current);
});
