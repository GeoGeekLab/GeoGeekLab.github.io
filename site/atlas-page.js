(() => {
  'use strict';

  const viewTitle = document.querySelector('#atlasViewTitle');
  const viewSummary = document.querySelector('#atlasViewSummary');
  const status = document.querySelector('#atlasStatus');
  const explain = document.querySelector('#atlasExplain');
  const philosophy = document.querySelector('.atlas-philosophy');
  const pageEyebrow = document.querySelector('.page-title .eyebrow');
  const pageIntro = document.querySelector('.page-title .page-intro');
  const inspector = document.querySelector('#atlasTip');
  const buttons = [...document.querySelectorAll('.projections [data-projection]')];
  if (!buttons.length) return;

  const views = {
    field: {
      label: 'RELATION',
      title: 'Relation',
      question: 'Which records belong near one another conceptually?',
      explain: 'Conceptual nearness: records share a field of thought or practice. Nearness here does not mean physical distance.'
    },
    time: {
      label: 'TIME',
      title: 'Time',
      question: 'What came earlier, and what came later?',
      explain: 'Chronology: the archive is arranged from earlier to later. Sequence becomes visible without implying causation.'
    },
    type: {
      label: 'FORMAT',
      title: 'Format',
      question: 'What kind of record is each one?',
      explain: 'Form: notes, lab instruments, places, and photos gather with records of the same kind.'
    },
    topic: {
      label: 'TOPIC',
      title: 'Topic',
      question: 'Which records share a subject?',
      explain: 'Subject: records with a shared topic move together, even when they come from different parts of the site.'
    },
    trace: {
      label: 'TRACE',
      title: 'Trace',
      question: 'Which records explicitly led to another?',
      explain: 'Continuity: authored links show where one question, method, or observation opened into another. This is not a timeline.'
    },
    geographic: {
      label: 'PLACE',
      title: 'Place',
      question: 'Which records can be placed on a map?',
      explain: 'Geography: only records with a real coordinate or extent enter the geographic frame. The rest remain visibly non-spatial.'
    }
  };

  const activeMode = () => document.querySelector('.projections [data-projection].is-active')?.dataset.projection || 'field';

  function normalizeEmptyInspector(mode) {
    if (!inspector?.classList.contains('is-empty')) return;
    const kicker = inspector.querySelector('span');
    const message = inspector.querySelector('strong');
    const view = views[mode] || views.field;
    if (kicker && kicker.textContent !== `ATLAS / ${view.label}`) kicker.textContent = `ATLAS / ${view.label}`;
    const text = 'Hover a record. Click to keep it selected.';
    if (message && message.textContent !== text) message.textContent = text;
  }

  function apply(mode) {
    const view = views[mode] || views.field;
    buttons.forEach(button => {
      const definition = views[button.dataset.projection];
      if (definition) button.textContent = definition.label;
    });
    if (viewTitle) viewTitle.textContent = view.title;
    if (viewSummary) viewSummary.textContent = view.question;
    if (status) status.textContent = `VIEW / ${view.label} · SAME ARCHIVE`;
    if (explain) explain.textContent = view.explain;
    normalizeEmptyInspector(mode);
  }

  if (pageEyebrow) pageEyebrow.textContent = 'ARCHIVE / VIEW / RELATION';
  if (pageIntro) pageIntro.textContent = 'The same records, rearranged by different questions.';
  if (philosophy) philosophy.textContent = 'Every view reveals one relation by letting another recede.';

  buttons.forEach(button => {
    button.addEventListener('click', () => apply(button.dataset.projection));
  });

  if (inspector) {
    const observer = new MutationObserver(() => normalizeEmptyInspector(activeMode()));
    observer.observe(inspector, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  apply(activeMode());
})();
