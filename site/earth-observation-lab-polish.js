(() => {
  'use strict';

  const lab = window.GeoEarthTemporalLab;
  const mounts = window.GeoGeekInstrumentMounts;
  if (!lab || !mounts?.earth || window.GeoEarthTemporalLabPolish) return;

  const originalMount = mounts.earth;

  function hardenSemantics(stage) {
    if (!stage) return () => {};

    const latestButton = stage.querySelector('#eoLatest');
    const range = stage.querySelector('#eoRange');
    const groups = stage.querySelector('#eoLayerGroups');
    const layerList = stage.querySelector('#eoLayerList');
    const coverageEnd = stage.querySelector('#eoCoverageEnd');
    const inspector = stage.querySelector('#eoInspectorMeta');
    const status = document.querySelector('.instrument-status');

    if (latestButton) {
      latestButton.textContent = 'SAFE DATE';
      latestButton.setAttribute('aria-label', 'Jump to conservative recent observation date');
      latestButton.title = 'Uses a conservative product-specific latency window; provider availability can differ.';
    }
    range?.setAttribute('aria-label', 'Days before conservative recent observation date');
    if (groups) groups.setAttribute('aria-orientation', 'horizontal');
    if (layerList) {
      layerList.setAttribute('role', 'tabpanel');
      layerList.setAttribute('aria-label', 'Observation products in the selected category');
    }

    function patchCoverage() {
      if (coverageEnd?.textContent?.startsWith('LATEST ')) {
        coverageEnd.textContent = coverageEnd.textContent.replace(/^LATEST /, 'SAFE THROUGH ');
      }
    }

    function patchStatus() {
      if (!status) return;
      if (status.textContent?.startsWith('STATUS / LIVE · UPDATED ')) {
        status.textContent = status.textContent.replace('STATUS / LIVE · UPDATED ', 'STATUS / READY · VIEW ');
      }
    }

    function patchInspector() {
      if (!inspector) return;
      const activeId = stage.querySelector('[data-earth-layer].is-active')?.dataset.earthLayer;
      const layer = (lab.layers || []).find(item => item.id === activeId);
      if (!layer) return;
      let row = inspector.querySelector('[data-eo-recent-policy]');
      if (!row) {
        row = document.createElement('div');
        row.dataset.eoRecentPolicy = '1';
        row.innerHTML = '<dt>RECENT-DATE POLICY</dt><dd></dd>';
        const limitRow = [...inspector.children].find(item => item.querySelector('dt')?.textContent === 'LIMIT');
        if (limitRow) inspector.insertBefore(row, limitRow);
        else inspector.appendChild(row);
      }
      const value = row.querySelector('dd');
      if (value) value.textContent = `Conservative T-${layer.lag} day request window; provider availability and upstream revisions can differ.`;
    }

    function patchTabs() {
      const buttons = [...stage.querySelectorAll('#eoLayerGroups [data-group]')];
      buttons.forEach((button, index) => {
        button.id ||= `eoLayerGroup-${index}`;
        button.setAttribute('aria-controls', 'eoLayerList');
        button.setAttribute('tabindex', button.getAttribute('aria-selected') === 'true' ? '0' : '-1');
      });
      const selected = buttons.find(button => button.getAttribute('aria-selected') === 'true');
      if (layerList && selected) layerList.setAttribute('aria-labelledby', selected.id);
    }

    let patching = false;
    const patchAll = () => {
      if (patching) return;
      patching = true;
      patchCoverage();
      patchStatus();
      patchInspector();
      patchTabs();
      patching = false;
    };

    patchAll();
    const stageObserver = new MutationObserver(patchAll);
    stageObserver.observe(stage, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['class','aria-selected'] });
    const statusObserver = status ? new MutationObserver(patchStatus) : null;
    statusObserver?.observe(status, { childList:true, characterData:true, subtree:true });

    return () => {
      stageObserver.disconnect();
      statusObserver?.disconnect();
    };
  }

  async function polishedMount(context) {
    const cleanup = await originalMount(context);
    const semanticCleanup = hardenSemantics(context?.stage);
    return () => {
      semanticCleanup();
      try { cleanup?.(); } catch {}
    };
  }

  mounts.earth = polishedMount;
  lab.mount = polishedMount;
  window.GeoEarthTemporalLabPolish = { version:'20261001b', hardenSemantics };
})();
