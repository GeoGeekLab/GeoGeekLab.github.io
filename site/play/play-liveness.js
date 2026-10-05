(() => {
  'use strict';

  const CARD_SELECTOR = '.lab-group-play .project-card.is-actionable';
  const INTERACTIVE_SELECTOR = 'a,button,input,select,textarea,summary,[role="button"],[role="link"]';

  document.addEventListener('click', event => {
    if (event.defaultPrevented) return;
    if (event.target.closest?.(INTERACTIVE_SELECTOR)) return;
    const card = event.target.closest?.(CARD_SELECTOR);
    if (!card) return;
    const trigger = card.querySelector('[data-instrument]');
    if (!trigger || trigger.disabled) return;
    trigger.click();
  });
})();
