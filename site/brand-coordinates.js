/* GEOGEEK / Four philosophical commitments under AI-mediated abundance. */
(() => {
  'use strict';
  const root = document.querySelector('#now .value-workbench');
  if (!root) return;

  const values = {
    open: {
      name: 'Open', input: 'MODELS', horizon: 'THE UNSEEN',
      axiom: 'No model contains the world.',
      question: 'What lies beyond the model?',
      expression: 'model(world) ≠ world'
    },
    taste: {
      name: 'Taste', input: 'SOLUTIONS', horizon: 'WHAT MATTERS',
      axiom: 'Correctness cannot decide what matters.',
      question: 'Which problems are worth solving?',
      expression: 'correct ≠ worthwhile'
    },
    respect: {
      name: 'Respect', input: 'OPTIMIZATION', horizon: 'EQUAL DIGNITY',
      axiom: 'Difference does not diminish dignity.',
      question: 'Whose values shape the objective?',
      expression: 'person ≠ metric'
    },
    respond: {
      name: 'Respond', input: 'AUTONOMY', horizon: 'ACCOUNTABILITY',
      axiom: 'Capability is not permission.',
      question: 'Who bears the consequences?',
      expression: 'can_build ≠ should_build'
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
