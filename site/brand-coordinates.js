/* Four complementary research lenses for the same geospatial claim. */
(() => {
  'use strict';
  const root = document.querySelector('#now .value-workbench');
  if (!root) return;
  const lenses = {
    open: {
      label: 'Open', meaning: 'Consider alternatives', output: 'Alternative explanations',
      question: 'Could season, atmosphere, or sensor differences explain this change?',
      action: 'Compare dates, sensors, and processing assumptions before interpreting the image.'
    },
    taste: {
      label: 'Taste', meaning: 'Find what matters', output: 'A discriminating test',
      question: 'Which measurement could separate a real change from an imaging artifact?',
      action: 'Choose a diagnostic that can challenge the favored explanation, not just reinforce it.'
    },
    respect: {
      label: 'Respect', meaning: 'Consider people and place', output: 'A context and impact note',
      question: 'Whose water, livelihoods, or decisions could this interpretation affect?',
      action: 'Document local context, uncertainty, and the possible consequences of being wrong.'
    },
    respond: {
      label: 'Respond', meaning: 'Make the work accountable', output: 'A reproducible record',
      question: 'Can another researcher inspect the claim and improve the method?',
      action: 'Share the sources, method, limits, and next test—not only the finished map.'
    }
  };
  const order = Object.keys(lenses);
  const buttons = [...root.querySelectorAll('[data-value-trigger]')];
  const names = ['Lens', 'Meaning', 'Output', 'Question', 'Action', 'Count'];
  const fields = Object.fromEntries(names.map(name => [name.toLowerCase(), document.getElementById('valueActive' + name)]));
  if (buttons.length !== order.length || Object.values(fields).some(field => !field)) return;

  function select(key) {
    const value = lenses[key];
    if (!value) return;
    root.dataset.valueState = key;
    buttons.forEach(button => {
      const active = button.dataset.valueTrigger === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    fields.lens.textContent = value.label;
    fields.meaning.textContent = value.meaning;
    fields.output.textContent = value.output;
    fields.question.textContent = value.question;
    fields.action.textContent = value.action;
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