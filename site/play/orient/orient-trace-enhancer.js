(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};
  if (orient.traceEnhancer?.version === 'orient-trace-enhancer-1') return;

  const VERSION = 'orient-trace-enhancer-1';
  root.core?.ensureStyle?.('play/orient/orient.css?v=20261003h', 'orient-trace-v1');

  function humanizePlaceId(value) {
    return String(value || '').split('-').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  function sessionRecords(shell) {
    const sessionId = shell?.dataset?.orientSessionId;
    if (!sessionId || typeof root.trace?.forPlay !== 'function') return [];
    return root.trace.forPlay('orient')
      .filter(record => record?.version === 2 && record.sessionId === sessionId && record.recordId)
      .sort((a, b) => Number(a.trial?.slot || 0) - Number(b.trial?.slot || 0));
  }

  function adapter(shell) {
    const field = shell.querySelector('.play-field-surface');
    const task = shell.querySelector('.play-task');
    const readout = shell.querySelector('.play-readout');
    const fieldNote = shell.querySelector('.play-field-note');
    if (!field || !task || !readout || !fieldNote) return null;
    return {
      root: shell,
      field,
      setTask(html) { task.innerHTML = html || ''; },
      setReadout(html) { readout.innerHTML = html || ''; },
      setConditions() {},
      setFieldNote(text = '') { fieldNote.textContent = text; },
      setActions() {}
    };
  }

  function humanizeCards(shell) {
    shell.querySelectorAll('.orient-trace-card-head strong').forEach(node => {
      const [from, to] = node.textContent.split('→').map(part => part.trim());
      if (!from || !to) return;
      node.textContent = `${humanizePlaceId(from)} → ${humanizePlaceId(to)}`;
    });
  }

  function enhanceShell(shell) {
    if (!shell?.isConnected || shell.dataset.playState !== 'trace') return false;
    if (shell.dataset.orientTraceViewVersion === 'orient-trace-view-1') return true;
    const records = sessionRecords(shell);
    if (records.length < 1 || typeof orient.traceView?.render !== 'function') return false;
    const target = adapter(shell);
    if (!target) return false;
    const rendered = orient.traceView.render({
      shell: target,
      records,
      sessionPlan: { seed: shell.dataset.orientSeed || '' }
    });
    if (rendered) humanizeCards(shell);
    return rendered;
  }

  function sweep() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.play-shell[data-play-kind="orient"]').forEach(enhanceShell);
  }

  let observer = null;
  function install() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || observer) return;
    observer = new MutationObserver(() => queueMicrotask(sweep));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-play-state'] });
    queueMicrotask(sweep);
  }

  orient.traceEnhancer = Object.freeze({ version: VERSION, humanizePlaceId, sessionRecords, enhanceShell, install });
  install();
})();
