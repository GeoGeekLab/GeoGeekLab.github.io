(() => {
  'use strict';

  const VERSION = '20261002e';
  const BASE_SRC = 'pulse-observation-lab-v3.js?v=20261002c';
  const EVENT_ATTACH_BATCH = 160;
  const previous = window.GeoPulseObservationLab;
  let basePromise = null;
  let stylePromise = null;
  let baseMount = previous?.version === '20261002c' ? previous.mount : null;
  let baseMeta = previous?.version === '20261002c' ? previous : null;

  function ensureStyle() {
    if (stylePromise) return stylePromise;
    const existing = document.querySelector('link[data-pulse-round5]');
    const link = existing || document.createElement('link');
    if (existing?.dataset.loaded === 'true' || existing?.sheet) {
      link.dataset.loaded = 'true';
      return Promise.resolve(true);
    }
    stylePromise = new Promise(resolve => {
      const finish = () => {
        link.dataset.loaded = 'true';
        link.dataset.loadFailed = 'false';
        resolve(true);
      };
      const fail = () => {
        link.dataset.loadFailed = 'true';
        console.warn('[GeoGeek] Pulse Round 5 control styling failed to load; baseline Pulse remains available.');
        resolve(false);
      };
      link.addEventListener('load', finish, { once:true });
      link.addEventListener('error', fail, { once:true });
      if (!existing) {
        link.rel = 'stylesheet';
        link.href = `pulse-observation-round5.css?v=${VERSION}`;
        link.dataset.pulseRound5 = '1';
        document.head.appendChild(link);
      }
    });
    return stylePromise;
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
      liveEventCount:eventNodes.length,
      attachBatches:0,
      progressiveEventDom:false,
      representation:root.dataset.representation || 'events'
    };
    window.GeoPulseRound5Stats = stats;

    let timelineFrame = 0;
    let pendingTimelineValue = null;
    let forwardingTimeline = false;
    let attachFrame = 0;
    let attachQueue = [];

    const updateEventStats = () => {
      if (!eventGroup) return;
      stats.liveEventCount = eventGroup.querySelectorAll('.pulse-event').length;
      stats.detachedEventCount = eventNodes.length - stats.liveEventCount;
      stats.progressiveEventDom = attachQueue.length > 0 || Boolean(attachFrame);
    };

    const stopProgressiveAttach = () => {
      if (attachFrame) cancelAnimationFrame(attachFrame);
      attachFrame = 0;
      attachQueue = [];
      stats.progressiveEventDom = false;
    };

    const attachBatch = () => {
      attachFrame = 0;
      if (!eventGroup?.isConnected || root.dataset.representation !== 'events') {
        stopProgressiveAttach();
        updateEventStats();
        return;
      }
      const fragment = document.createDocumentFragment();
      const batch = attachQueue.splice(0, EVENT_ATTACH_BATCH);
      batch.forEach(node => fragment.appendChild(node));
      if (batch.length) {
        eventGroup.appendChild(fragment);
        stats.attachBatches += 1;
      }
      updateEventStats();
      if (attachQueue.length) attachFrame = requestAnimationFrame(attachBatch);
    };

    const syncEventDom = () => {
      if (!eventGroup) return;
      const density = root.dataset.representation === 'density';
      stats.representation = density ? 'density' : 'events';
      stopProgressiveAttach();
      if (density) {
        eventNodes.forEach(node => {
          if (node.parentNode === eventGroup) detachedEvents.appendChild(node);
        });
        updateEventStats();
        return;
      }
      attachQueue = eventNodes.filter(node => node.parentNode !== eventGroup);
      updateEventStats();
      if (attachQueue.length) attachFrame = requestAnimationFrame(attachBatch);
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
      stopProgressiveAttach();
      representationObserver.disconnect();
      timeline?.removeEventListener('input', coalesceTimeline, true);
      playButton?.removeEventListener('click', reducedPlayHandler, true);
      if (motionQuery?.removeEventListener) motionQuery.removeEventListener('change', motionChangeHandler);
      else motionQuery?.removeListener?.(motionChangeHandler);
      if (window.GeoPulseRound5Stats === stats) delete window.GeoPulseRound5Stats;
    };
  }

  async function resilientMount(context = {}) {
    const stage = context.stage || document.getElementById('instrumentStage');
    const busyToken = `pulse-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (stage) {
      stage.dataset.pulseBusyToken = busyToken;
      stage.setAttribute('aria-busy', 'true');
    }

    let baseCleanup = null;
    let resilienceCleanup = null;
    try {
      const [mount] = await Promise.all([ensureBase(), ensureStyle()]);
      baseCleanup = await mount(context);
      // v3 loads v2 lazily during its first mount and rebinds itself afterwards.
      // Refresh inherited metadata after that nested lifecycle has completed.
      const resolvedBase = window.GeoPulseObservationLab;
      if (resolvedBase?.version === '20261002c') baseMeta = resolvedBase;
      bindResilient();
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
    const current = window.GeoPulseObservationLab;
    if (current?.version === '20261002c') baseMeta = current;
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
        eventDom:'progressive-batched-reattach',
        reducedMotion:'manual-one-hour-step',
        loading:'abort-safe-aria-busy'
      }
    };
  }

  void ensureStyle();
  bindResilient();
})();