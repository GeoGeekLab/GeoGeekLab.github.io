(() => {
  'use strict';

  const sourcePanel = document.getElementById('sourcePanel');
  const inspector = document.getElementById('inspector');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (!sourcePanel || !inspector) return;

  const dockMedia = matchMedia('(min-width: 981px)');
  const desktop = () => dockMedia.matches;
  const storage = {
    read(key) {
      try {
        const value = sessionStorage.getItem(key);
        return value == null ? null : value === '1';
      } catch { return null; }
    },
    get(key, fallback = false) {
      const value = this.read(key);
      return value == null ? fallback : value;
    },
    set(key, value) {
      try { sessionStorage.setItem(key, value ? '1' : '0'); } catch {}
    }
  };

  let sourceDocked = storage.get('earth-source-docked');
  let inspectorDocked = storage.get('earth-inspector-docked');
  const storedSourceOpen = storage.read('earth-source-open');
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

  // MapLibre listens for the native window resize event. Trigger one after the
  // dock transition settles; do not subscribe this controller to that same
  // event or it would create a resize feedback loop.
  const requestMapResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => window.dispatchEvent(new Event('resize')), 270);
  };

  const sync = ({ resize = true } = {}) => {
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

    if (resize) requestMapResize();
  };

  const rememberSourceVisibility = () => requestAnimationFrame(() => {
    storage.set('earth-source-open', sourcePanel.classList.contains('is-open'));
    sync();
  });

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

  const observer = new MutationObserver(() => sync());
  observer.observe(sourcePanel, { attributes: true, attributeFilter: ['class'] });
  observer.observe(inspector, { attributes: true, attributeFilter: ['class'] });

  sidebarToggle?.addEventListener('click', rememberSourceVisibility);
  sourceClose?.addEventListener('click', rememberSourceVisibility);
  inspectorClose?.addEventListener('click', () => requestAnimationFrame(() => sync()));

  // Only the docking breakpoint matters to this controller. Normal viewport
  // resize remains MapLibre's responsibility and does not re-enter sync().
  const handleDockBreakpoint = () => sync();
  if (dockMedia.addEventListener) dockMedia.addEventListener('change', handleDockBreakpoint);
  else dockMedia.addListener?.(handleDockBreakpoint);

  const restoreSourceVisibility = () => {
    if (storedSourceOpen != null) {
      sourcePanel.classList.toggle('is-open', storedSourceOpen);
      sidebarToggle?.setAttribute('aria-expanded', String(storedSourceOpen));
    }
    sync();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(restoreSourceVisibility, 0), { once: true });
  } else {
    setTimeout(restoreSourceVisibility, 0);
  }

  sync({ resize: false });
})();
