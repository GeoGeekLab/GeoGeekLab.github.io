import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const engine = readFileSync(new URL('../../site/orbital/orbital-engine.js', import.meta.url), 'utf8');
const fullpage = readFileSync(new URL('../../site/lab-fullpage.js', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../../site/orbital/orbit-round2.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../site/orbital/orbit-round2.css', import.meta.url), 'utf8');

class Vec {
  constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
  fromBufferAttribute(attribute, i) { return this.copy(attribute.points[i]); }
  copy(vector) { Object.assign(this, vector); return this; }
  project() { return this; } // Controlled camera projection in normalized device coordinates.
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  normalize() {
    const length = Math.hypot(this.x, this.y, this.z) || 1;
    this.x /= length; this.y /= length; this.z /= length;
    return this;
  }
  distanceToSquared(other) {
    return (this.x - other.x) ** 2 + (this.y - other.y) ** 2 + (this.z - other.z) ** 2;
  }
}
class Ray {
  set() { return this; }
  intersectSphere() { return null; }
}

function picker(rect) {
  const start = engine.indexOf('  const pickPosition = new THREE.Vector3();');
  const end = engine.indexOf('  let dragPointer = null;', start);
  assert.ok(start >= 0 && end > start, 'Pixel picker must exist');
  const code = engine.slice(start, end);
  const THREE = { Vector3:Vec, Ray, Sphere:class { constructor() {} } };
  const canvas = { getBoundingClientRect: () => rect };
  const pointGeometry = {
    getAttribute: () => ({ count:2, points:[
      { x:0, y:0, z:0.2 },
      { x:0.04, y:0, z:0.2 }
    ] }),
    userData:{ indices:[0, 1] }
  };
  const camera = { position:new Vec(0, 0, 3), updateMatrixWorld() {} };
  const state = { meta:[{ id:'100' }, { id:'200' }] };
  return new Function('THREE','canvas','pointGeometry','camera','state', code + '\nreturn pickPointAt;')(
    THREE, canvas, pointGeometry, camera, state
  );
}

test('pixel picking uses the canvas rectangle and closest visible dot', () => {
  const pick = picker({ left:100, top:200, width:800, height:600 });
  assert.equal(pick(500, 500), 0);
  assert.equal(pick(516, 500), 1);
  assert.equal(pick(536, 500), null);
});

test('pixel picking stays aligned after the canvas resizes and moves', () => {
  const pick = picker({ left:130, top:250, width:1200, height:900 });
  assert.equal(pick(730, 700), 0);
  assert.equal(pick(754, 700), 1);
  assert.equal(pick(790, 700), null);
});

test('click uses release coordinates and cancellation cannot select', () => {
  assert.match(engine, /pickPointAt\(e\.clientX, e\.clientY, e\.pointerType === 'touch' \? 14 : 8\)/);
  assert.match(engine, /!cancelled && !moved/);
  assert.doesNotMatch(engine, /selectByIndex\(state\.hoverIndex\)/);
});

test('Orbit does not expose or trigger workspace density modes', () => {
  assert.match(fullpage, /toolbar\.hidden = !isCore \|\| kind === 'pulse' \|\| kind === 'orbit'/);
  assert.match(fullpage, /if \(kind === 'orbit'\) \{[\s\S]*?delete dialog\.dataset\.workspaceMode;/);
  assert.match(fullpage, /activeKind === 'pulse' \|\| activeKind === 'orbit'/);
  assert.doesNotMatch(sidebar, /activateWorkspaceMode|data-workspace-mode|installRailNav/);
  assert.doesNotMatch(css, /data-workspace-mode|orbit-rail-nav/);
});

test('Sidebar retains search, selection and hidden advanced scientific controls', () => {
  assert.match(sidebar, /\[catalog, object, view\]/);
  assert.match(sidebar, /\[ground, source\]/);
  assert.match(sidebar, /document\.createElement\('details'\)/);
  assert.match(sidebar, /scrollSection\(sections\.object\)/);
  assert.match(engine, /groundResizeObserver\.observe\(groundCanvas\)/);
});
