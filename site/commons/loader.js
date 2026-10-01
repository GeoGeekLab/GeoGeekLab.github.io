(() => {
  'use strict';

  const target = document.getElementById('commons');
  if (!target) return;

  const scripts = [
    '/commons/config.js',
    '/commons/geo.js',
    '/commons/demo-data.js?v=20260930b',
    '/commons/commons-data.js?v=20260930b',
    '/commons/commons.js?v=20260930e'
  ];

  let started = false;
  let observer = null;

  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Commons script failed: ${src}`));
    document.head.appendChild(script);
  });

  const start = async () => {
    if (started) return;
    started = true;
    observer?.disconnect();
    target.dataset.commonsLoading = 'true';
    try {
      for (const src of scripts) await load(src);
      target.dataset.commonsReady = 'true';
    } catch (error) {
      started = false;
      target.dataset.commonsLoading = 'false';
      target.dataset.commonsReady = 'false';
      console.error(error);
    }
  };

  if (location.hash === '#commons') {
    start();
    return;
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) start();
    }, { rootMargin: '480px 0px', threshold: 0 });
    observer.observe(target);
  } else {
    addEventListener('load', () => setTimeout(start, 1200), { once: true });
  }

  // Keyboard navigation to a Commons control should never wait for scrolling.
  target.addEventListener('focusin', start, { once: true });
  target.addEventListener('pointerdown', start, { once: true, passive: true });
})();
