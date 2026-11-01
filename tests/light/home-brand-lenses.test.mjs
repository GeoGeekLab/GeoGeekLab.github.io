import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { coordinateDimensions, coordinateValues } from './coordinates-fixture.mjs';

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../../site/coordinates-field.js', import.meta.url), 'utf8');
const start = html.indexOf('<section class="home-section coordinates-section');
const end = html.indexOf('<section class="home-section home-commons-full', start);
const coordinates = html.slice(start, end);

function interactiveField() {
  const fields = new Map();
  for (const id of ['Index', 'Title', 'Lead', 'Description', 'Relation', 'Insight']) fields.set(`#coordReadout${id}`, { textContent: '' });
  const trace = { setAttribute(name, value) { this[name] = value; } };
  fields.set('#coordActiveTrace', trace);
  let focused;
  const groups = ['.coord-readout-navigation', '.coord-plot'];
  const triggers = groups.flatMap(group => coordinateValues.map(value => ({
    group, dataset: { coordValue: value.id }, handlers: {}, attrs: {},
    classList: { toggle() {} },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute(name, value) { this.attrs[name] = value; },
    closest(selector) { return selector === group ? {} : null; },
    focus() { focused = this; },
  })));
  const root = {
    dataset: {},
    querySelectorAll: () => triggers,
    querySelector(selector) {
      if (fields.has(selector)) return fields.get(selector);
      if (selector === '.coord-contours') return null;
      return triggers.find(trigger => selector === `${trigger.group} [data-coord-value="${trigger.dataset.coordValue}"]`) || null;
    },
  };
  vm.runInNewContext(runtime, { document: { querySelector: selector => selector === '#now .coord-atlas' ? root : null } });
  return { fields, trace, root, triggers, focused: () => focused };
}

function assertValue(field, value) {
  assert.equal(field.root.dataset.active, value.id);
  for (const [suffix, expected] of [
    ['Index', `${value.number} / ${value.name.toUpperCase()}`], ['Title', value.name],
    ['Lead', value.lead], ['Description', value.description],
    ['Relation', value.relation], ['Insight', value.insight],
  ]) assert.equal(field.fields.get(`#coordReadout${suffix}`).textContent, expected, `${value.id}: ${suffix}`);
  assert.equal(field.trace.d, `M 380 270 L ${value.x} ${value.y}`);
  for (const trigger of field.triggers) assert.equal(trigger.attrs['aria-pressed'], String(trigger.dataset.coordValue === value.id));
}

test('Coordinates publishes the Research Engineer identity and all three practice dimensions', () => {
  assert.ok(start >= 0 && end > start);
  assert.match(coordinates, /<h2>Coordinates<\/h2>/);
  assert.match(coordinates, /<h3>Research Engineer<\/h3>/);
  assert.equal((coordinates.match(/class="coord-pillar"/g) || []).length, 3);
  for (const [axis, label] of coordinateDimensions) {
    assert.ok(coordinates.includes(`<span class="coord-pillar-axis">${axis}</span><strong>${label}</strong>`), label);
  }
});

test('each value has native buttons in both groups and an announced active readout', () => {
  assert.match(coordinates, /class="coord-readout" aria-live="polite" aria-atomic="true"/);
  assert.match(coordinates, /role="group" aria-label="Select a value"/);
  assert.match(coordinates, /class="coord-plot" role="group" aria-label="Conceptual relationship map; choose one of four value nodes"/);
  const buttons = [...coordinates.matchAll(/<button\b[^>]*data-coord-value="([^"]+)"[^>]*>/g)].map(match => ({ id: match[1], tag: match[0] }));
  assert.equal(buttons.length, 8);
  for (const value of coordinateValues) {
    const pair = buttons.filter(button => button.id === value.id);
    assert.equal(pair.length, 2, value.name);
    for (const button of pair) {
      assert.match(button.tag, /type="button"/);
      assert.ok(button.tag.includes(`aria-pressed="${value.id === 'open'}"`));
    }
  }
  assert.match(html, /<script[^>]*src="\/coordinates-field\.js(?:\?[^" ]*)?"/);
});

test('selecting either group preserves every exact authored value and synchronizes the readout', () => {
  const field = interactiveField();
  assertValue(field, coordinateValues[0]);
  for (const trigger of field.triggers) {
    trigger.handlers.click();
    assertValue(field, coordinateValues.find(value => value.id === trigger.dataset.coordValue));
  }
});

test('arrow and boundary keys select a value and keep focus in the originating group', () => {
  for (const group of ['.coord-readout-navigation', '.coord-plot']) {
    const field = interactiveField();
    const startButton = field.triggers.find(trigger => trigger.group === group && trigger.dataset.coordValue === 'open');
    for (const [key, id] of [['ArrowRight', 'taste'], ['ArrowLeft', 'respond'], ['End', 'respond'], ['Home', 'open']]) {
      let prevented = false;
      startButton.handlers.keydown({ key, preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
      assertValue(field, coordinateValues.find(value => value.id === id));
      assert.equal(field.focused().group, group);
      assert.equal(field.focused().dataset.coordValue, id);
    }
  }
});

test('the conceptual field and neighboring Commons keep their meaning and structure', () => {
  assert.match(coordinates, /RELATIONS, NOT RANKINGS/);
  assert.match(coordinates, /It does not measure physical locations or distances\./);
  assert.match(html, /AI Native · Geospatial Engineering · Open Science/);
  assert.match(html, /id="commonsMap"/);
  assert.equal((html.match(/<section\b/g) || []).length, (html.match(/<\/section>/g) || []).length);
});
