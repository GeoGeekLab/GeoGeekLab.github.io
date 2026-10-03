import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
const durable = [];
let delegated = 0;
globalThis.GeoPlay = {
  trace: { readAll: () => durable.slice() },
  orient: {
    session: {
      BASE_TRIAL_COUNT: 4,
      composeAdaptationTrial(options) {
        delegated += 1;
        return { ok: true, options };
      }
    }
  }
};

await import('../../site/play/orient/orient-adaptation-guard.js');
const guarded = globalThis.GeoPlay.orient.session;
const records = [1, 2, 3, 4].map(slot => ({ recordId: `or_guard:t${slot}`, play: 'orient' }));

test('adaptive fifth trial is blocked until all four evidence records are durable', () => {
  durable.push(...records.slice(0, 3));
  assert.throws(
    () => guarded.composeAdaptationTrial({ records }),
    /requires 4 durable committed records/
  );
  assert.equal(delegated, 0);
});

test('adaptive fifth trial delegates only when all four record ids exist in durable Trace', () => {
  durable.length = 0;
  durable.push(...records, { recordId: 'other:t1', play: 'bound' });
  const result = guarded.composeAdaptationTrial({ records, marker: 'contract' });
  assert.equal(result.ok, true);
  assert.equal(result.options.marker, 'contract');
  assert.equal(delegated, 1);
});
