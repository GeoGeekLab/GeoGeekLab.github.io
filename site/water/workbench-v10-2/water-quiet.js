/* Water as Spectrum | Quiet Workbench
 * Progressive disclosure of existing UI nodes only.
 * The physics engine, persisted experiment state and delegated controls are untouched.
 */
(() => {
  'use strict';

  const disclosureState = new Map();
  let contextExpanded = false;
  let chartExplanationExpanded = false;

  function createDisclosure(parent, nodes, label, key, className = '') {
    if (!parent || !nodes.length) return null;
    const first = nodes[0];
    if (!first?.parentElement || first.parentElement !== parent) return null;

    const details = document.createElement('details');
    details.className = 'water-detail-group ' + className;
    details.dataset.quietDisclosure = key;

    const summary = document.createElement('summary');
    summary.textContent = label;
    const body = document.createElement('div');
    body.className = 'water-detail-content';

    details.append(summary, body);
    parent.insertBefore(details, first);
    nodes.forEach(node => body.appendChild(node));
    details.open = key === 'context' ? contextExpanded : disclosureState.get(key) === true;
    details.addEventListener('toggle', () => {
      if (key === 'context') contextExpanded = details.open;
      else disclosureState.set(key, details.open);
    });
    return details;
  }

  function installScientificScope() {
    const status = document.getElementById('uiStatusBar');
    const method = document.getElementById('v10Science');
    if (!status || !method || document.querySelector('.water-scope-strip')) return;

    const strip = document.createElement('section');
    strip.className = 'water-scope-strip';
    strip.setAttribute('aria-label', 'Scientific model scope');

    const label = document.createElement('span');
    label.className = 'water-scope-label';
    label.textContent = 'SCIENTIFIC SCOPE';

    const boundary = document.createElement('strong');
    boundary.className = 'water-scope-boundary';
    boundary.textContent = 'Teaching model · Not externally validated';

    const more = document.createElement('details');
    more.className = 'water-scope-more';
    const summary = document.createElement('summary');
    summary.textContent = 'Methods & data';
    const body = document.createElement('div');
    body.className = 'water-scope-detail';

    status.before(strip);
    strip.append(label, boundary, more);
    more.append(summary, body);
    body.append(status, method);
  }

  function activeWorkspace() {
    return document.querySelector('#mainNav [data-tab][aria-selected="true"]')?.dataset.tab || 'iop';
  }

  function installCompactControls() {
    const rail = document.getElementById('controls');
    if (!rail) return;
    const fields = rail.querySelector(':scope > .ui-setup-fields');
    if (!fields) return;

    // Re-render replaces the contents of #controls. Preserve disclosure intent,
    // then move the newly rendered nodes into native details.
    const context = rail.querySelector(':scope > .ui-setup-context');
    if (context) {
      createDisclosure(rail, [context], 'Experiment context', 'context', 'water-detail-group--context');
    }

    const tab = activeWorkspace();
    const sections = [...fields.children].filter(node => node.matches('.ui-control-section'));
    const extra = (label, nodes, key) => {
      if (nodes.length && nodes.every(node => node.parentElement === fields)) {
        createDisclosure(fields, nodes, label, tab + ':' + key, 'water-detail-group--extra');
      }
    };

    if (tab === 'iop' && sections[1]) {
      const core = sections[1];
      const params = [...core.children].filter(node => node.matches('.param'));
      if (params.length >= 4) {
        createDisclosure(core, params.slice(2),
          'More water constituents · NAP & backscatter', tab + ':constituents');
      }
    } else if (tab === 'atm') {
      extra('Pressure & observation geometry', sections.slice(1), 'geometry');
    } else if (tab === 'sensor') {
      extra('Band samples & detailed values', sections.slice(2, 3), 'samples');
    } else if (tab === 'uncertainty') {
      // Sensor/selected parameters/noise stay visible; numerical diagnostics are secondary.
      extra('Finite-difference & export settings', sections.slice(3), 'diagnostics');
    }
  }

  function compactWaterOpticsChart() {
    const main = document.getElementById('mainContent');
    const optics = main?.querySelector('.p6-optics');
    const intro = optics?.querySelector('.p6-optics-intro');
    if (!intro || optics.dataset.quietChart === '1') return;
    optics.dataset.quietChart = '1';

    // Keep the title, scientific scope, and model-variant warning visible.
    // Move only explanatory paragraphs into a keyboard-accessible disclosure.
    const paragraphs = [...intro.children].filter(node =>
      node.matches('p:not(.p6-baseline):not(.p6-variant)'));
    if (!paragraphs.length) return;

    const details = document.createElement('details');
    details.className = 'water-chart-method';
    const summary = document.createElement('summary');
    summary.textContent = 'What this model shows · assumptions';
    const body = document.createElement('div');
    body.className = 'water-chart-method-body';
    details.append(summary, body);
    paragraphs.forEach(node => body.appendChild(node));
    intro.appendChild(details);
    details.open = chartExplanationExpanded;
    details.addEventListener('toggle', () => { chartExplanationExpanded = details.open; });
  }

  function init() {
    installScientificScope();
    const rail = document.getElementById('controls');
    if (!rail) return;

    installCompactControls();
    compactWaterOpticsChart();
    const main = document.getElementById('mainContent');
    if (main) {
      const chartObserver = new MutationObserver(records => {
        if (records.some(record => record.target === main && record.type === 'childList')) {
          compactWaterOpticsChart();
        }
      });
      chartObserver.observe(main, { childList: true });
    }

    const observer = new MutationObserver(records => {
      if (!records.some(record => record.target === rail && record.type === 'childList')) return;
      installCompactControls();
    });
    observer.observe(rail, { childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
