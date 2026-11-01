import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../site/water/workbench-v10-2/instrument.js', import.meta.url), 'utf8');

function host() {
  const dialog = { dataset: {} };
  class Element extends EventTarget {
    constructor(tag) {
      super(); this.tagName = tag; this.dataset = {}; this.children = [];
      this.contentWindow = {}; this.attributes = {};
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(...nodes) { for (const node of nodes) { this.children.push(node); node.parent = this; } }
    appendChild(node) { this.append(node); }
    replaceChildren(...nodes) { this.children.forEach(node => { node.parent = null; }); this.children = []; this.append(...nodes); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; }
    closest() { return dialog; }
    contains(node) { return this.children.includes(node); }
  }
  const stage = new Element('section');
  const document = {
    baseURI: 'https://example.test/lab.html', head: new Element('head'),
    querySelector: () => null, getElementById: () => stage,
    createElement: tag => new Element(tag)
  };
  const window = new EventTarget();
  const retries = [];
  window.GeoInstruments = { openByKind: kind => retries.push(kind) };
  const context = { window, document, URL, location: { origin: 'https://example.test' }, setTimeout, clearTimeout, console: { error() {} } };
  vm.createContext(context);
  vm.runInContext(source, context);
  const mount = window.GeoWaterWorkbenchV102.mount;
  function message(frame, type) {
    const event = new Event('message');
    Object.assign(event, { source: frame.contentWindow, origin: context.location.origin,
      data: { type, instance: new URL(frame.src).searchParams.get('instance'), message: 'Test failure' } });
    window.dispatchEvent(event);
  }
  return { mount, stage, dialog, document, retries, message };
}

test('Water startup failure exposes explicit recovery and delegates retry to the host session', async () => {
  const h = host(), controller = new AbortController();
  const pending = h.mount({ stage: h.stage, signal: controller.signal });
  const frame = h.stage.children[0];
  assert.match(frame.src, /water\/workbench-v10-2\/app\/index\.html/);
  h.message(frame, 'geogeek:water-v5:boot-error');
  const cleanup = await pending;
  const panel = h.stage.children[0];
  assert.equal(panel.attributes.role, 'alert');
  assert.equal(panel.className, 'instrument-error water-startup-error');
  const retry = panel.children.find(node => node.tagName === 'button');
  const link = panel.children.find(node => node.tagName === 'a');
  assert.equal(link.href, 'https://example.test/water/workbench-v10-2/app/index.html');
  retry.dispatchEvent(new Event('click'));
  assert.deepEqual(h.retries, ['water']);
  assert.equal(h.document.head.children.some(node => node.tagName === 'script'), false);
  cleanup();
  assert.equal(h.stage.children.length, 0);
});

test('Water cancellation removes the pending iframe without rendering an error or switching versions', async () => {
  const h = host(), controller = new AbortController();
  const pending = h.mount({ stage: h.stage, signal: controller.signal });
  controller.abort();
  const cleanup = await pending;
  cleanup();
  assert.equal(h.stage.children.length, 0);
  assert.equal(h.dialog.dataset.waterUiVersion, undefined);
  assert.deepEqual(h.retries, []);
});
