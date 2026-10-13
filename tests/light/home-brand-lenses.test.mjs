import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../site/brand-coordinates.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../site/brand-coordinates.js', import.meta.url), 'utf8');
const states = ['open', 'taste', 'respect', 'respond'];
const fieldNames = ['Input', 'Lens', 'Output', 'Axiom', 'Question', 'Expression', 'Count'];

function mount() {
  const buttons = states.map(key => ({
    dataset: { valueTrigger: key },
    attributes: {}, events: {}, classList: { toggle() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.events[name] = handler; },
    focus() { this.focused = true; }
  }));
  const fields = Object.fromEntries(
    fieldNames.map(key => ['valueActive' + key, { textContent: '' }])
  );
  const workbench = { dataset: {}, querySelectorAll: () => buttons };
  const document = {
    querySelector: selector => selector === '#now .value-workbench' ? workbench : null,
    getElementById: id => fields[id] ?? null
  };
  runInNewContext(source, { document });
  return { buttons, fields, workbench };
}

test('homepage uses the settled brand, a single-line identity, and four values', () => {
  for (const name of states) assert.match(html, new RegExp('data-value-trigger="' + name + '"'));
  for (const field of fieldNames) assert.match(html, new RegExp('id="valueActive' + field + '"'));
  assert.match(html, /AI Native · Geospatial Engineering · Open Science/);
  assert.match(html, /<p class="page-intro concept-section-intro coordinate-self">I'm a Research Engineer\.<\/p>/);
  assert.match(css, /\.coordinate-self\s*\{[^}]*white-space:nowrap!important/s);
  assert.doesNotMatch(html, /IDENTITY \/|satellite image|ILLUSTRATIVE CASE|Four commitments shape/);
  assert.doesNotMatch(html, /coordinateCanvas|data-coordinate-trigger=/);
  assert.match(html, /id="commonsMap"/);
});

test('each operator produces a distinct philosophical thesis, question, and horizon', () => {
  const { buttons, fields, workbench } = mount();
  const seen = new Set();
  for (const [index, button] of buttons.entries()) {
    button.events.click();
    assert.equal(workbench.dataset.valueState, states[index]);
    assert.equal(button.attributes['aria-pressed'], 'true');
    assert.equal(fields.valueActiveCount.textContent, '0' + (index + 1) + ' / 04');
    assert.ok(fields.valueActiveExpression.textContent.includes('→'));
    seen.add([
      fields.valueActiveInput.textContent,
      fields.valueActiveOutput.textContent,
      fields.valueActiveAxiom.textContent,
      fields.valueActiveQuestion.textContent
    ].join('|'));
  }
  assert.equal(seen.size, 4);
});

test('arrow, Home, and End keys navigate the modes', () => {
  const { buttons, fields } = mount();
  let prevented = false;
  buttons[0].events.keydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(fields.valueActiveLens.textContent, 'Taste');
  assert.equal(buttons[1].focused, true);
  assert.equal(prevented, true);
  buttons[1].events.keydown({ key: 'End', preventDefault() {} });
  assert.equal(fields.valueActiveLens.textContent, 'Respond');
  buttons[3].events.keydown({ key: 'Home', preventDefault() {} });
  assert.equal(fields.valueActiveLens.textContent, 'Open');
});
