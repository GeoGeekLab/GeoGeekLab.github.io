(() => {
  'use strict';

  const GeoPlay = window.GeoPlay = window.GeoPlay || {};

  function create(stage, { kind, triad, taskLabel = 'FIELD' } = {}) {
    if (!stage) throw new Error('GeoPlay shell requires a stage.');
    stage.innerHTML = `
      <div class="play-shell" data-play-kind="${kind || ''}">
        <section class="play-field" aria-label="${kind || 'Spatial'} field">
          <div class="play-field-surface"></div>
          <div class="play-field-note" aria-live="polite"></div>
        </section>
        <aside class="play-console">
          <div class="play-console-head">
            <span>${taskLabel}</span>
            <small>${triad || ''}</small>
          </div>
          <div class="play-task"></div>
          <div class="play-readout" aria-live="polite"></div>
          <div class="play-conditions" aria-label="Observation conditions"></div>
          <div class="play-actions"></div>
        </aside>
      </div>`;

    const root = stage.querySelector('.play-shell');
    const field = root.querySelector('.play-field-surface');
    const fieldNote = root.querySelector('.play-field-note');
    const task = root.querySelector('.play-task');
    const readout = root.querySelector('.play-readout');
    const conditions = root.querySelector('.play-conditions');
    const actions = root.querySelector('.play-actions');

    const renderConditions = rows => {
      conditions.innerHTML = (rows || []).map(([label, value]) => `
        <div class="play-condition-row"><span>${label}</span><strong>${value}</strong></div>`).join('');
    };

    const setActions = specs => {
      actions.innerHTML = '';
      (specs || []).forEach(spec => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `play-action${spec.secondary ? ' is-secondary' : ''}`;
        button.textContent = spec.label;
        button.disabled = Boolean(spec.disabled);
        if (spec.ariaLabel) button.setAttribute('aria-label', spec.ariaLabel);
        button.addEventListener('click', spec.onClick);
        actions.appendChild(button);
      });
    };

    return {
      root,
      field,
      fieldNote,
      task,
      readout,
      conditions,
      actions,
      setTask(html) { task.innerHTML = html || ''; },
      setReadout(html) { readout.innerHTML = html || ''; },
      setFieldNote(text = '') { fieldNote.textContent = text; },
      setConditions: renderConditions,
      setActions,
      setState(state) { root.dataset.playState = state; }
    };
  }

  GeoPlay.shell = { create };
})();