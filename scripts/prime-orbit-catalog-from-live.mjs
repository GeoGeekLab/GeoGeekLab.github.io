#!/usr/bin/env node
process.env.DATA_SUPPLY_ONLY = 'orbit-active';
if (process.env.ORBIT_LIVE_BASE) process.env.DATA_SUPPLY_LIVE_BASE = process.env.ORBIT_LIVE_BASE.replace(/orbital\/data\/?$/, '');
await import('./prime-data-supply-from-live.mjs');
