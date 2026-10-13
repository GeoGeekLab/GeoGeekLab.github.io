/* GEOGEEK / Four philosophical commitments under AI-mediated abundance. */
(() => {
  'use strict';
  const root = document.querySelector('#now .value-workbench');
  if (!root) return;

  const values = {
    open: {
      name: 'Open', input: 'MODELS', horizon: 'HYPOTHESES',
      axiom: 'The unknown expands the search space.',
      question: 'What should we explore beyond the model?',
      expression: 'hypothesisSpace.expand()'
    },
    taste: {
      name: 'Taste', input: 'POSSIBILITIES', horizon: 'PURPOSE',
      axiom: 'Judgment defines the objective function.',
      question: 'Which problem is worth solving?',
      expression: 'objective = human.judgment()'
    },
    respect: {
      name: 'Respect', input: 'OPTIMIZATION', horizon: 'DIGNITY',
      axiom: 'Human dignity is a system invariant.',
      question: 'Whose agency shapes the system?',
      expression: 'assert(dignity.isInvariant)'
    },
    respond: {
      name: 'Respond', input: 'AUTONOMY', horizon: 'ACCOUNTABILITY',
      axiom: 'Own the side effects.',
      question: 'Who owns the downstream effects?',
      expression: 'sideEffects.forEach(own)'
    }
  };
  const order = Object.keys(values);
  const buttons = [...root.querySelectorAll('[data-value-trigger]')];
  const fields = Object.fromEntries(
    ['Input', 'Lens', 'Output', 'Axiom', 'Question', 'Expression', 'Count']
      .map(key => [key.toLowerCase(), document.getElementById('valueActive' + key)])
  );
  if (buttons.length !== order.length || Object.values(fields).some(field => !field)) return;

  function select(key) {
    const value = values[key];
    if (!value) return;
    root.dataset.valueState = key;
    for (const button of buttons) {
      const active = button.dataset.valueTrigger === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    fields.input.textContent = value.input;
    fields.lens.textContent = value.name;
    fields.output.textContent = value.horizon;
    fields.axiom.textContent = value.axiom;
    fields.question.textContent = value.question;
    fields.expression.textContent = value.expression;
    fields.count.textContent = String(order.indexOf(key) + 1).padStart(2, '0') + ' / 04';
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button.dataset.valueTrigger));
    button.addEventListener('keydown', event => {
      const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      let next;
      if (delta) next = (index + delta + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      buttons[next].focus();
      select(buttons[next].dataset.valueTrigger);
    });
  });
  select('open');
})();
