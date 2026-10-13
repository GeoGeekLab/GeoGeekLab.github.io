import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../site/brand-coordinates.js', import.meta.url), 'utf8');
const states = ['open', 'taste', 'respect', 'respond'];

function mount() {
  const buttons = states.map(key => ({
    dataset: { valueTrigger: key },
    attributes: {}, events: {}, classList: { toggle() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.events[name] = handler; },
    focus() { this.focused = true; }
  }));
  const fields = Object.fromEntries(
    ['Lens', 'Meaning', 'Output', 'Question', 'Action', 'Count'].map(key => ['valueActive' + key, { textContent: '' }])
  );
  const workbench = { dataset: {}, querySelectorAll: () => buttons };
  const document = {
    querySelector: selector => selector === '#now .value-workbench' ? workbench : null,
    getElementById: id => fields[id] ?? null
  };
  runInNewContext(source, { document });
  return { buttons, fields, workbench };
}

test('homepage contains the exact four values, three pillars, and identity', () => {
  for (const name of states) assert.match(html, new RegExp('data-value-trigger="' + name + '"'));
  assert.match(html, /AI Native · Geospatial Engineering · Open Science/);
  assert.match(html, /Research Engineer/);
  assert.doesNotMatch(html, /coordinateCanvas|data-coordinate-trigger=/);
  assert.match(html, /ILLUSTRATIVE CASE · NOT OBSERVATIONAL DATA/);
});

test('every research lens changes both the question and proposed action', () => {
  const { buttons, fields, workbench } = mount();
  const signatures = new Set();
  for (const [index, button] of buttons.entries()) {
    button.events.click();
    assert.equal(workbench.dataset.valueState, states[index]);
    assert.equal(button.attributes['aria-pressed'], 'true');
    assert.equal(fields.valueActiveCount.textContent, '0' + (index + 1) + ' / 04');
    signatures.add(fields.valueActiveQuestion.textContent + '|' + fields.valueActiveAction.textContent);
  }
  assert.equal(signatures.size, 4);
});

test('keyboard navigation changes the lens and preserves focus', () => {
  const { buttons, fields } = mount();
  let prevented = false;
  buttons[0].events.keydown({ key:'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(fields.valueActiveLens.textContent, 'Taste');
  assert.equal(buttons[1].focused, true);
  assert.equal(prevented, true);
  buttons[1].events.keydown({ key:'End', preventDefault() {} });
  assert.equal(fields.valueActiveLens.textContent, 'Respond');
});
