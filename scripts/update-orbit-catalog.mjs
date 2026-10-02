#!/usr/bin/env node
process.env.DATA_SUPPLY_ONLY = 'orbit-active';
if (process.env.ORBIT_FORCE_REFRESH === '1') process.env.DATA_SUPPLY_FORCE = '1';
if (process.env.ORBIT_ALLOW_STALE === '1') process.env.DATA_SUPPLY_ALLOW_STALE = '1';
await import('./update-data-supply.mjs');
