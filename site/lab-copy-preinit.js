(() => {
  'use strict';

  // Lab-specific copy must exist before app.js applies localized UI data.
  // This keeps the entry page and runtime-rendered principle in one semantic state.
  const ui = window.GEOGEEK_DATA?.en?.ui;
  if (!ui) return;

  if (ui.pages?.lab) {
    ui.pages.lab.intro = 'Interactive geographic instruments for observing change, comparing representations, and reasoning through space.';
  }

  if (ui.lab) {
    ui.lab.principle = 'Every instrument declares what it can see — and what it cannot.';
    ui.lab.enter = 'OPEN INSTRUMENT';
  }
})();
