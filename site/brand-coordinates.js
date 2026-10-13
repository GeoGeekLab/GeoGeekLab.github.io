/* GEOGEEK / Four values as four ways of approaching the world. */
(() => {
  'use strict';
  const root = document.querySelector('#now .value-workbench');
  if (!root) return;

  const values = {
    open: {
      name: 'Open', input: 'UNKNOWN', horizon: 'POSSIBILITY',
      axiom: 'The world is larger than every frame.',
      question: 'What remains unseen?',
      expression: 'open(unknown) → possibility'
    },
    taste: {
      name: 'Taste', input: 'POSSIBILITY', horizon: 'MEANING',
      axiom: 'Not everything possible is worth making.',
      question: 'What deserves to exist?',
      expression: 'discern(possibility) → meaning'
    },
    respect: {
      name: 'Respect', input: 'DIFFERENCE', horizon: 'RECOGNITION',
      axiom: 'Difference does not diminish dignity.',
      question: 'Whose world is missing from our view?',
      expression: 'respect(difference) → recognition'
    },
    respond: {
      name: 'Respond', input: 'KNOWLEDGE', horizon: 'RESPONSIBILITY',
      axiom: 'Knowing changes what we owe the world.',
      question: 'What will our work set in motion?',
      expression: 'respond(knowledge) → responsibility'
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
