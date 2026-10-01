(() => {
  'use strict';

  const viewTitle = document.querySelector('#atlasViewTitle');
  const viewSummary = document.querySelector('#atlasViewSummary');
  const philosophy = document.querySelector('.atlas-philosophy');
  const pageEyebrow = document.querySelector('.page-title .eyebrow');
  const pageIntro = document.querySelector('.page-title .page-intro');
  const buttons = [...document.querySelectorAll('.projections [data-projection]')];
  if (!buttons.length) return;

  const views = {
    field: {
      label: 'RELATION',
      title: 'Relation',
      question: 'Which records become adjacent when read by relation?'
    },
    time: {
      label: 'TIME',
      title: 'Time',
      question: 'Which records sit near one another in time?'
    },
    type: {
      label: 'FORMAT',
      title: 'Format',
      question: 'What kind of record is each one?'
    },
    topic: {
      label: 'TOPIC',
      title: 'Topic',
      question: 'Which records gather around a shared subject?'
    },
    trace: {
      label: 'TRACE',
      title: 'Trace',
      question: 'Which records explicitly lead to another?'
    },
    geographic: {
      label: 'PLACE',
      title: 'Place',
      question: 'Which records have a geographic reference — and which do not?'
    }
  };

  function apply(mode) {
    const view = views[mode] || views.field;
    buttons.forEach(button => {
      const definition = views[button.dataset.projection];
      if (definition) button.textContent = definition.label;
    });
    if (viewTitle) viewTitle.textContent = view.title;
    if (viewSummary) viewSummary.textContent = view.question;
  }

  if (pageEyebrow) pageEyebrow.textContent = 'ARCHIVE / VIEW / RELATION';
  if (pageIntro) pageIntro.textContent = 'The same records, rearranged by different questions.';
  if (philosophy) philosophy.textContent = 'Every view reveals one relation by letting another recede.';

  buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.projection)));
  const active = document.querySelector('.projections [data-projection].is-active')?.dataset.projection || 'field';
  apply(active);
})();
