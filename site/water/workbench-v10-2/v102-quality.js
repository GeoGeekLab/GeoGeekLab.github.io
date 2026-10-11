/* Show a scroll affordance only while additional workspaces exist to the right.
   Presentational navigation enhancement; no model state or experiment data. */
(() => {
  'use strict';
  function init() {
    const nav = document.querySelector('.appnav');
    const scroller = nav?.querySelector('.nav-scroll');
    if (!nav || !scroller) return;

    const sync = () => {
      const hasMore = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2;
      nav.classList.toggle('has-more-right', hasMore);
    };
    scroller.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(sync);
      observer.observe(scroller);
    }
    if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(sync);
      observer.observe(scroller, { childList: true, subtree: true });
    }
    requestAnimationFrame(sync);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
