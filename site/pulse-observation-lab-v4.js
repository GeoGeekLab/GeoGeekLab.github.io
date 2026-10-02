(() => {
  'use strict';

  const VERSION = '20261002d';
  const BASE_SRC = 'pulse-observation-lab-v3.js?v=20261002c';
  const previous = window.GeoPulseObservationLab;
  let basePromise = null;
  let baseMount = previous?.version === '20261002c' ? previous.mount : null;
  let baseMeta = previous?.version === '20261002c' ? previous : null;

  function ensureStyle() {
    if (document.querySelector('link[data-pulse-round5]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `pulse-observation-round5.css?v=${VERSION}`;
    link.dataset.pulseRound5 = '1';
    document.head.appendChild(link);
  }

  function ensureBase() {
    if (baseMount) return Promise.resolve(baseMount);
    if (basePromise) return basePromise;
    basePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = BASE_SRC;
      script.async = true;
      script.dataset.pulseRound5Base = '1';
      script.addEventListener('load', () => {
        const loaded = window.GeoPulseObservationLab;
        if (!loaded?.mount || loaded.mount === resilientMount) {
          reject(new Error('Pulse Round 5 base workbench did not bind.'));
          return;
        }
        baseMeta = loaded;
        baseMount = loaded.mount;
        bindResilient();
        resolve(baseMount);
      }, { once:true });
      script.addEventListener('error', () => reject(new Error(`Failed to load ${BASE_SRC}`)), { once:true });
      document.head.appendChild(script);
    });
    return basePromise;
  }

  function installResilience(stage) {
    const root = stage?.querySelector('.pulse-observation-lab[data-state="ready"]');
    if (!root) return () => {};

    const timeline = root.querySelector('#pulseTimeline');
    const playButton = root.querySelector('#pulsePlay');
    const eventGroup = root.querySelector('.pulse-events');
    const eventNodes = eventGroup ? [...eventGroup.querySelectorAll('.pulse-event')] : [];
    const detachedEvents = document.createDocumentFragment();
    const stats = {
      inputEvents:0,
      forwardedTimelineFrames:0,
      eventNodeCount:eventNodes.length,
      detachedEventCount:0,
      representation:root.dataset.representation || 'events'
    };
    window.GeoPulseRound5Stats = stats;

    let timelineFrame = 0;
    let pendingTimelineValue = null;
    let forwardingTimeline = false;

    const syncEventDom = () => {
      if (!eventGroup) return;
      const density = root.dataset.representation === 'density';
      stats.representation = density ? 'density' : 'events';
      if (density) {
        eventNodes.forEach(node => {
          if (node.parentNode === eventGroup) detachedEvents.appendChild(node);
        });
      } else {
        eventNodes.forEach(node => {
          if (node.parentNode !== eventGroup) eventGroup.appendChild(node);
        });
      }
      stats.detachedEventCount = eventNodes.filter(node => node.parentNode !== eventGroup).length;
    };

    const representationObserver = new MutationObserver(records => {
      if (records.some(record => record.attributeName === 'data-representation')) syncEventDom();
    });
    representationObserver.observe(root, { attributes:true, attributeFilter:['data-representation'] });
    syncEventDom();

    const flushTimeline = () => {
      timelineFrame = 0;
      if (!timeline?.isConnected || pendingTimelineValue == null) return;
      timeline.value = pendingTimelineValue;
      pendingTimelineValue = null;
      forwardingTimeline = true;
      stats.forwardedTimelineFrames += 1;
      timeline.dispatchEvent(new Event('input', { bubbles:true }));
      forwardingTimeline = false;
    };

    const coalesceTimeline = event => {
      if (forwardingTimeline) return;
      stats.inputEvents += 1;
      pendingTimelineValue = timeline.value;
      event.stopImmediatePropagation();
      if (!timelineFrame) timelineFrame = requestAnimationFrame(flushTimeline);
    };
    timeline?.addEventListener('input', coalesceTimeline, true);

    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let bypassReducedMotion = false;

    const updateMotionMode = () => {
      const reduced = Boolean(motionQuery?.matches);
      root.dataset.motion = reduced ? 'reduced' : 'standard';
      if (!playButton || !timeline) return;
      if (reduced && playButton.getAttribute('aria-pressed') === 'true') {
        bypassReducedMotion = true;
        playButton.click();
        bypassReducedMotion = false;
      }
      if (reduced) {
        playButton.setAttribute('aria-pressed', 'false');
        playButton.textContent = Number(timeline.value) >= 1440 ? 'STEP FROM START' : 'STEP +1 H';
      } else if (playButton.getAttribute('aria-pressed') !== 'true') {
        playButton.textContent = Number(timeline.value) >= 1440 ? 'PLAY FROM START' : 'PLAY';
      }
    };

    const reducedPlayHandler = event => {
      if (bypassReducedMotion || !motionQuery?.matches || !timeline || !playButton) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = Number(timeline.value) || 0;
      timeline.value = String(current >= 1440 ? 0 : Math.min(1440, current + 60));
      timeline.dispatchEvent(new Event('input', { bubbles:true }));
      playButton.setAttribute('aria-pressed', 'false');
      playButton.textContent = Number(timeline.value) >= 1440 ? 'STEP FROM START' : 'STEP +1 H';
    };
    playButton?.addEventListener('click', reducedPlayHandler, true);

    const motionChangeHandler = () => updateMotionMode();
    if (motionQuery?.addEventListener) motionQuery.addEventListener('change', motionChangeHandler);
    else motionQuery?.addListener?.(motionChangeHandler);
    updateMotionMode();

    return () => {
      if (timelineFrame) cancelAnimationFrame(timelineFrame);
      representationObserver.disconnect();
      timeline?.removeEventListener('input', coalesceTimeline, true);
      playButton?.removeEventListener('click', reducedPlayHandler, true);
      if (motionQuery?.removeEventListener) motionQuery.removeEventListener('change', motionChangeHandler);
      else motionQuery?.removeListener?.(motionChangeHandler);
      if (window.GeoPulseRound5Stats === stats) delete window.GeoPulseRound5Stats;
    };
  }

  async function resilientMount(context = {}) {
    ensureStyle();
    const stage = context.stage || document.getElementById('instrumentStage');
    const busyToken = `pulse-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (stage) {
      stage.dataset.pulseBusyToken = busyToken;
      stage.setAttribute('aria-busy', 'true');
    }

    let baseCleanup = null;
    let resilienceCleanup = null;
    try {
      const mount = await ensureBase();
      baseCleanup = await mount(context);
      if (context.signal?.aborted) return () => { baseCleanup?.(); };
      resilienceCleanup = installResilience(stage);
      return () => {
        resilienceCleanup?.();
        baseCleanup?.();
      };
    } finally {
      if (stage?.dataset.pulseBusyToken === busyToken) {
        stage.removeAttribute('aria-busy');
        delete stage.dataset.pulseBusyToken;
      }
    }
  }

  function bindResilient() {
    const metadata = baseMeta || {};
    window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
    window.GeoGeekInstrumentMounts.pulse = resilientMount;
    window.GeoPulseObservationLab = {
      ...metadata,
      version:VERSION,
      mount:resilientMount,
      resilience:{
        timeline:'requestAnimationFrame-coalesced',
        densityDom:'event-nodes-detached-while-count-grid-active',
        reducedMotion:'manual-one-hour-step',
        loading:'abort-safe-aria-busy'
      }
    };
  }

  ensureStyle();
  bindResilient();
})();