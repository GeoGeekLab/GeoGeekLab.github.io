(() => {
  'use strict';

  const sourcePanel = document.getElementById('sourcePanel');
  const inspector = document.getElementById('inspector');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (!sourcePanel || !inspector) return;

  const desktop = () => matchMedia('(min-width: 981px)').matches;
  const storage = {
    get(key, fallback = false) {
      try {
        const value = sessionStorage.getItem(key);
        return value == null ? fallback : value === '1';
      } catch { return fallback; }
    },
    set(key, value) {
      try { sessionStorage.setItem(key, value ? '1' : '0'); } catch {}
    }
  };

  let sourceDocked = storage.get('earth-source-docked');
  let inspectorDocked = storage.get('earth-inspector-docked');
  let resizeTimer = 0;

  const makeDockButton = label => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-dock-button';
    button.setAttribute('aria-label', `Dock ${label}`);
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'DOCK';
    return button;
  };

  const sourceDock = makeDockButton('layers panel');
  const sourceHead = sourcePanel.querySelector('.panel-head');
  const sourceClose = document.getElementById('panelClose');
  if (sourceHead && sourceClose) {
    let actions = sourceHead.querySelector('.panel-window-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'panel-window-actions';
      sourceHead.appendChild(actions);
    }
    actions.append(sourceDock, sourceClose);
  }

  const inspectorDock = makeDockButton('inspector');
  const inspectorClose = document.getElementById('inspectorClose');
  if (inspectorClose) {
    const actions = document.createElement('div');
    actions.className = 'inspector-window-actions';
    inspector.prepend(actions);
    actions.append(inspectorDock, inspectorClose);
  }

  const requestMapResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      dispatchEvent(new Event('resize'));
      window.GeoGeekEarthMap?.resize?.();
    }, 270);
  };

  const sync = () => {
    const sourceOpen = sourcePanel.classList.contains('is-open');
    const inspectorOpen = inspector.classList.contains('is-open');
    const canDock = desktop();

    document.body.classList.toggle('earth-source-docked-open', canDock && sourceDocked && sourceOpen);
    document.body.classList.toggle('earth-inspector-docked-open', canDock && inspectorDocked && inspectorOpen);
    sourcePanel.classList.toggle('is-docked', canDock && sourceDocked);
    inspector.classList.toggle('is-docked', canDock && inspectorDocked);

    sourceDock.textContent = sourceDocked ? 'FLOAT' : 'DOCK';
    sourceDock.setAttribute('aria-pressed', String(sourceDocked));
    sourceDock.setAttribute('aria-label', sourceDocked ? 'Float layers panel' : 'Dock layers panel');
    inspectorDock.textContent = inspectorDocked ? 'FLOAT' : 'DOCK';
    inspectorDock.setAttribute('aria-pressed', String(inspectorDocked));
    inspectorDock.setAttribute('aria-label', inspectorDocked ? 'Float inspector' : 'Dock inspector');

    requestMapResize();
  };

  sourceDock.addEventListener('click', () => {
    sourceDocked = !sourceDocked;
    storage.set('earth-source-docked', sourceDocked);
    sync();
  });

  inspectorDock.addEventListener('click', () => {
    inspectorDocked = !inspectorDocked;
    storage.set('earth-inspector-docked', inspectorDocked);
    sync();
  });

  const observer = new MutationObserver(sync);
  observer.observe(sourcePanel, { attributes: true, attributeFilter: ['class'] });
  observer.observe(inspector, { attributes: true, attributeFilter: ['class'] });

  sidebarToggle?.addEventListener('click', () => requestAnimationFrame(sync));
  sourceClose?.addEventListener('click', () => requestAnimationFrame(sync));
  inspectorClose?.addEventListener('click', () => requestAnimationFrame(sync));
  addEventListener('resize', sync, { passive: true });

  sync();
})();
