/* GeoGeek runtime stability guards.
   Keeps decorative work idle, coalesces high-frequency Commons controls,
   and preserves truthful degraded/demo states without changing content semantics. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);

  function installGeoFieldIdleGuard() {
    let attempts = 0;
    const tryInstall = () => {
      attempts += 1;
      const field = window.GeoField;
      if (!field?.pause || !field?.resume) {
        if (attempts < 60) setTimeout(tryInstall, 50);
        return;
      }

      let idleTimer = 0;
      let stopped = false;
      const pause = () => {
        clearTimeout(idleTimer);
        field.pause();
      };
      const kick = () => {
        if (stopped || document.hidden) return;
        field.resume();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(pause, 420);
      };

      if (reducedMotion || saveData) {
        stopped = true;
        setTimeout(pause, 80);
      } else {
        ['pointermove', 'pointerdown', 'wheel', 'scroll', 'resize', 'focusin'].forEach(type => {
          addEventListener(type, kick, { passive: true });
        });
        setTimeout(pause, 520);
      }

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) pause();
        else if (!stopped) kick();
        else pause();
      });
      addEventListener('pagehide', pause, { once: true });
      document.documentElement.dataset.geoFieldIdleGuard = 'active';
    };
    tryInstall();
  }

  function installCommonsGuards() {
    let snapshotWrapped = false;
    let attempts = 0;

    const wrapSnapshot = () => {
      if (snapshotWrapped) return true;
      const data = window.GeoCommonsData;
      if (!data?.snapshot) return false;
      snapshotWrapped = true;
      const originalSnapshot = data.snapshot.bind(data);
      let revision = 0;
      let latestRaw = null;
      data.snapshot = (...args) => {
        const ownRevision = ++revision;
        const raw = Promise.resolve().then(() => originalSnapshot(...args));
        latestRaw = raw;
        return raw.then(async value => {
          if (ownRevision === revision) return value;
          try { return await latestRaw; }
          catch { return value; }
        });
      };
      return true;
    };

    const poll = () => {
      attempts += 1;
      if (wrapSnapshot()) return;
      if (attempts < 100) setTimeout(poll, 150);
    };
    poll();

    let replayingHour = false;
    let hourTimer = 0;
    document.addEventListener('input', event => {
      const input = event.target?.closest?.('#commonsHour');
      if (!input || replayingHour) return;
      event.stopImmediatePropagation();
      clearTimeout(hourTimer);
      hourTimer = setTimeout(() => {
        replayingHour = true;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        replayingHour = false;
      }, 120);
    }, true);

    let replayingTimeControl = false;
    let controlTimer = 0;
    document.addEventListener('click', event => {
      const button = event.target?.closest?.('[data-horizon], [data-time-mode], [data-time-ref]');
      if (!button || !button.closest('.commons-page') || replayingTimeControl) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clearTimeout(controlTimer);
      controlTimer = setTimeout(() => {
        replayingTimeControl = true;
        button.click();
        replayingTimeControl = false;
      }, 90);
    }, true);

    addEventListener('geogeek:commons-storage-error', event => {
      const context = event.detail?.context || 'contribution';
      setTimeout(() => {
        const feedback = $('#observationFeedback');
        if (!feedback) return;
        feedback.textContent = `The browser could not persist this ${context === 'location' ? 'location' : 'local contribution'}. It may disappear after refresh; check privacy/storage settings.`;
        feedback.dataset.state = 'error';
      }, 0);
    });
  }

  function tuneDemoAndPreviewCopy() {
    const config = window.GEOGEEK_COMMONS_CONFIG;
    if (config?.mode === 'demo') {
      const mode = $('#homeCommonsMode');
      if (mode && !/demo/i.test(mode.textContent || '')) mode.textContent = `DEMO · ${mode.textContent}`;
      const gateway = $('#commons-gateway .commons-gateway-kicker');
      if (gateway && !/demo/i.test(gateway.textContent || '')) gateway.textContent = `DEMO / ${gateway.textContent}`;
    }

    const preview = $('.earth-lab-preview');
    if (preview) {
      const live = $('.earth-preview-status span', preview);
      const clock = $('.earth-preview-status b', preview);
      const consoleSpans = $$('.earth-preview-console > span', preview);
      const caption = $('.earth-preview-caption-head > span:first-child', preview);
      if (live) live.innerHTML = '<i></i>PREVIEW';
      if (clock) clock.textContent = 'SAMPLE';
      if (consoleSpans[0]) consoleSpans[0].textContent = 'TIME / ILLUSTRATIVE';
      if (consoleSpans[1]) consoleSpans[1].textContent = 'SAMPLE VIEW';
      if (caption) caption.textContent = 'INSTRUMENT PREVIEW';
    }
  }

  function manageStaticFallbacks() {
    const atlasFallback = $('.atlas-static-fallback');
    if (!atlasFallback) return;
    const removeWhenReady = () => {
      if ($('#atlasStage .atlas-node')) {
        atlasFallback.remove();
        return true;
      }
      return false;
    };
    if (removeWhenReady()) return;
    const stage = $('#atlasStage');
    if (!stage) return;
    const observer = new MutationObserver(() => {
      if (removeWhenReady()) observer.disconnect();
    });
    observer.observe(stage, { childList: true, subtree: true });
  }

  installGeoFieldIdleGuard();
  installCommonsGuards();
  tuneDemoAndPreviewCopy();
  manageStaticFallbacks();
})();
