/* GeoGeek UX v4 — production behavior refinements. */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  let locale = 'en';
  document.documentElement.lang = 'en';
  if (!$('#origin')) document.body.classList.add('ux-inner-page');

  // Keep the site's vocabulary aligned with the navigation concept.
  const archiveLocales = window.GEOGEEK_ARCHIVE?.locales;
  if (archiveLocales?.en?.ui) {
    archiveLocales.en.ui.nav && (archiveLocales.en.ui.nav.map = 'Index');
    if (archiveLocales.en.ui.siteMap) {
      archiveLocales.en.ui.siteMap.title = 'SITE INDEX';
      archiveLocales.en.ui.siteMap.mode = 'SITE TOPOLOGY / INDEX';
      archiveLocales.en.ui.siteMap.hint = 'Choose a node to change position or information scale.';
    }
  }


  const renameIndex = () => {
    locale = 'en';
    const navToggle = $('#navToggle');
    const toggleLabel = 'Index';
    if (navToggle && navToggle.textContent !== toggleLabel) navToggle.textContent = toggleLabel;
    const map = $('#siteMap');
    if (!map) return;
    const heading = map.querySelector('h2');
    const headingLabel = 'SITE INDEX';
    if (heading && /site map|map|site index/i.test(heading.textContent || '') && heading.textContent !== headingLabel) {
      heading.textContent = headingLabel;
    }
  };
  renameIndex();

  // Commons remains part of the homepage, but not a numbered Sheet Index item.
  $$('.sheet-index-sub[data-sheet-link="commons-gateway"]').forEach(node => node.remove());

  // Surface three actual Field Notes immediately after the hero without duplicating content data.
  const selected = $('#selectedWorkRows');
  const fillSelectedWork = () => {
    if (!selected || selected.childElementCount) return true;
    const sourceRows = $$('#latestNotes .preview-row').slice(0, 3);
    if (!sourceRows.length) return false;
    selected.replaceChildren(...sourceRows.map(row => {
      const clone = row.cloneNode(true);
      clone.removeAttribute('data-contour-bound');
      return clone;
    }));
    window.bindContourTargets?.();
    return true;
  };
  if (selected && !fillSelectedWork()) {
    const latest = $('#latestNotes');
    if (latest) {
      const selectedObserver = new MutationObserver(() => {
        if (fillSelectedWork()) selectedObserver.disconnect();
      });
      selectedObserver.observe(latest, { childList: true, subtree: true });
    }
  }
  const applyLocalizedUxCopy = () => {
    const copy = [
      ['#selectedWorkKicker', 'SELECTED / FIELD NOTES'],
      ['#selectedWorkTitle', 'Recent records from the archive.'],
      ['#selectedWorkAll', 'OPEN FIELD NOTES ↗'],
      ['#orbitalAssist', 'KEYBOARD · FOCUS THE FIELD AND PRESS ENTER TO OPEN THE ORBIT INSTRUMENT']
    ];
    for (const [selector, text] of copy) {
      const node = $(selector);
      if (node && node.textContent !== text) node.textContent = text;
    }
  };
  applyLocalizedUxCopy();

  // Orbital field: one-time interaction cue plus keyboard parity.
  const canvas = $('#orbitalThresholdCanvas');
  const instruction = $('#orbitalInstruction');
  const dismissInstruction = () => {
    instruction?.classList.add('is-dismissed');
    try { sessionStorage.setItem('geogeek-orbit-onboarded', '1'); } catch {}
  };
  try {
    if (sessionStorage.getItem('geogeek-orbit-onboarded') === '1') instruction?.classList.add('is-dismissed');
  } catch {}
  if (canvas) {
    canvas.tabIndex = 0;
    if ($('#orbitalAssist')) canvas.setAttribute('aria-describedby', 'orbitalAssist');
    canvas.addEventListener('pointerdown', dismissInstruction, { once: true });
    canvas.addEventListener('click', dismissInstruction, { once: true });
    canvas.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      location.href = 'lab.html?instrument=orbit#l04';
    });
  }

  // Compact information-scale readout, with keyboard and touch disclosure.
  const scale = $('.scale-ui');
  if (scale) {
    scale.setAttribute('role', 'button');
    scale.setAttribute('aria-haspopup', 'true');
    const syncScaleA11y = () => scale.setAttribute('aria-expanded', scale.classList.contains('is-open') ? 'true' : 'false');
    syncScaleA11y();
    scale.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      scale.classList.toggle('is-open');
      syncScaleA11y();
    });
    scale.addEventListener('click', event => {
      if (matchMedia('(hover: none)').matches || innerWidth <= 760) {
        event.stopPropagation();
        scale.classList.toggle('is-open');
        syncScaleA11y();
      }
    });
    document.addEventListener('click', () => {
      scale.classList.remove('is-open');
      syncScaleA11y();
    });
  }

  // Move the scale out of the way near the footer and while the full Index is open.
  const footer = $('.footer');
  const navToggle = $('#navToggle');
  if (scale && footer && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      scale.classList.toggle('is-near-footer', entry.isIntersecting);
    }, { rootMargin: '0px 0px 56px 0px', threshold: 0 });
    observer.observe(footer);
  }
  const syncIndexState = () => {
    document.body.classList.toggle('ux-index-open', navToggle?.getAttribute('aria-expanded') === 'true');
  };
  if (navToggle) {
    syncIndexState();
    new MutationObserver(syncIndexState).observe(navToggle, { attributes: true, attributeFilter: ['aria-expanded'] });
  }

  // App-rendered UI can appear after initial execution.
  const mutation = new MutationObserver(() => renameIndex());
  mutation.observe(document.body, { childList: true, subtree: true });

  // Give source titles a transition identity for supported cross-document transitions.
  const titleForLink = link => {
    const row = link.closest('.preview-row, .project-card-home, .atlas-preview');
    return row?.querySelector('strong, h2, h3, .atlas-caption') || null;
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const href = new URL(link.href, location.href);
    if (href.origin !== location.origin) return;
    const title = titleForLink(link);
    if (title) title.style.viewTransitionName = 'geogeek-page-title';
  }, { capture: true });

  // Data Saver only disables decorative background work; instruments/content remain intact.
  if (navigator.connection?.saveData) document.body.classList.add('ux-data-saver');
  $$('main img').forEach(img => {
    if (!img.hasAttribute('loading')) img.loading = 'lazy';
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
  });

  addEventListener('pagehide', () => window.GeoField?.pause?.(), { passive: true });
})();

/* GeoGeek UX v5 — mobile experience system */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const mobileMQ = matchMedia('(max-width: 860px)');
  const coarseMQ = matchMedia('(pointer: coarse)');

  const getPageKind = () => {
    const path = location.pathname.split('/').pop() || 'index.html';
    if (/field-notes/i.test(path)) return 'field-notes';
    if (/lab/i.test(path)) return 'lab';
    if (/atlas/i.test(path)) return 'atlas';
    if (/commons/i.test(path)) return 'commons';
    if (/elsewhere/i.test(path)) return 'elsewhere';
    if (/record/i.test(path) || document.body.classList.contains('archive-record-page') || $('.record-shell')) return 'record';
    return 'home';
  };

  const pageKind = getPageKind();
  document.body.dataset.pageKind = pageKind;

  const applyMobileFlag = () => {
    const active = mobileMQ.matches || coarseMQ.matches;
    document.body.classList.toggle('ux-mobile-v5', active);
  };
  applyMobileFlag();
  mobileMQ.addEventListener?.('change', applyMobileFlag);
  coarseMQ.addEventListener?.('change', applyMobileFlag);

  // Primary mobile dock for the five core destinations.
  const ensureMobileDock = () => {
    if (!document.body.classList.contains('ux-mobile-v5')) {
      $('.mobile-dock')?.remove();
      return;
    }
    if ($('.mobile-dock')) return;
    const dock = document.createElement('nav');
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Primary');
    const items = [
      ['index.html', 'Home', 'home'],
      ['field-notes.html', 'Notes', 'notes'],
      ['lab.html', 'Lab', 'lab'],
      ['atlas.html', 'Atlas', 'atlas'],
      ['elsewhere.html', 'Elsewhere', 'elsewhere']
    ];
    const current = pageKind === 'record' || pageKind === 'commons' ? 'notes' : pageKind === 'field-notes' ? 'notes' : pageKind;
    dock.innerHTML = items.map(([href, label, key]) => {
      const active = current === key || (current === 'home' && key === 'home');
      const url = new URL(href, location.href);
      return `<a href="${url.pathname}${url.search}${url.hash}" data-dock="${key}"${active ? ' class="is-active" aria-current="page"' : ''}><span>${label}</span></a>`;
    }).join('');
    document.body.appendChild(dock);
  };
  ensureMobileDock();


  // Scroll-aware chrome: slightly condense the top bar after the reader commits to the page.
  let raf = 0;
  const syncScrollChrome = () => {
    raf = 0;
    document.body.classList.toggle('ux-nav-condensed', scrollY > 28);
  };
  addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(syncScrollChrome);
  }, { passive: true });
  syncScrollChrome();

  // Improve mobile semantics with card affordances and page-specific classes.
  document.body.classList.add(`ux-page-${pageKind}`);
  if (pageKind === 'home') {
    $('#selected-work')?.setAttribute('data-ux-shelf', 'selected-work');
    $('#now')?.setAttribute('data-ux-shelf', 'coordinates');
    $('#lab')?.setAttribute('data-ux-shelf', 'lab');
    $('#elsewhere')?.setAttribute('data-ux-shelf', 'elsewhere');
  }

  // Ensure the mobile dock does not steal focus order before main content.
  $('.mobile-dock')?.querySelectorAll('a').forEach(a => a.tabIndex = 0);
})();

/* GeoGeek UX v5.1 — device-review corrections */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const mobile = () => matchMedia('(max-width: 860px)').matches;

  // Touch vocabulary: "MOVE" is a mouse instruction and reads incorrectly on phones.
  const tuneOrbitalCue = () => {
    if (!mobile()) return;
    const cue = $('#orbitalInstruction');
    if (!cue) return;
    const spans = cue.querySelectorAll('span');
    if (spans.length >= 3) {
      spans[0].textContent = 'TAP';
      spans[1].textContent = 'SELECT';
      spans[2].textContent = 'TRACE';
    }
  };

  // Auto-hide bottom dock while reading down; restore on upward intent or near page end.
  let lastY = Math.max(0, scrollY);
  let ticking = false;
  const syncDock = () => {
    ticking = false;
    if (!mobile() || !document.body.classList.contains('ux-mobile-v5')) {
      document.body.classList.remove('ux-dock-hidden');
      lastY = Math.max(0, scrollY);
      return;
    }
    const y = Math.max(0, scrollY);
    const delta = y - lastY;
    const nearTop = y < 96;
    const nearBottom = y + innerHeight >= document.documentElement.scrollHeight - 120;
    const indexOpen = document.body.classList.contains('ux-index-open') || document.body.classList.contains('site-map-open');
    if (indexOpen || nearTop || nearBottom || delta < -7) {
      document.body.classList.remove('ux-dock-hidden');
    } else if (delta > 8 && y > 140) {
      document.body.classList.add('ux-dock-hidden');
    }
    lastY = y;
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncDock);
  }, { passive: true });

  // Site Index is a navigation surface on phones, so keep the body state synchronized
  // even if the dialog implementation toggles classes asynchronously.
  const syncSiteMapState = () => {
    const dialog = $('#siteMap');
    if (!dialog) return;
    const open = dialog.open || dialog.hasAttribute('open');
    document.body.classList.toggle('site-map-open', open);
    if (open) document.body.classList.remove('ux-dock-hidden');
  };

  const observer = new MutationObserver(() => {
    tuneOrbitalCue();
    syncSiteMapState();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });

  tuneOrbitalCue();
  syncDock();
  syncSiteMapState();
  addEventListener('resize', () => requestAnimationFrame(() => {
    tuneOrbitalCue();
    syncDock();
    syncSiteMapState();
  }), { passive: true });
})();

/* GeoGeek UX v5.2 — autonomous review behavior */
(() => {
  'use strict';
  const mobile = () => matchMedia('(max-width: 860px)').matches;

  // When Site Index opens, center its active information-scale step. This keeps the
  // rail legible without forcing five compressed labels into one phone width.
  const centerActiveScale = () => {
    if (!mobile()) return;
    const map = document.querySelector('#siteMap');
    if (!map || !(map.open || map.hasAttribute('open'))) return;
    const rail = map.querySelector('.map-scale');
    const active = rail?.querySelector('.is-active');
    if (!rail || !active) return;
    requestAnimationFrame(() => {
      try { active.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' }); }
      catch { rail.scrollLeft = Math.max(0, active.offsetLeft - (rail.clientWidth - active.clientWidth) / 2); }
    });
  };

  const observer = new MutationObserver(centerActiveScale);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open','class'] });
  centerActiveScale();
})();

/* v5.2 final content-order pass */
(() => {
  'use strict';
  const mq = matchMedia('(max-width: 860px)');
  const portal = document.querySelector('.wechat-archive-portal.archive-channel');
  const list = document.querySelector('#noteList');
  if (!portal || !list) return;
  const marker = document.createComment('wechat-archive-origin');
  portal.parentNode?.insertBefore(marker, portal);
  const sync = () => {
    if (mq.matches) {
      if (list.nextElementSibling !== portal) list.insertAdjacentElement('afterend', portal);
    } else if (marker.parentNode && marker.nextSibling !== portal) {
      marker.parentNode.insertBefore(portal, marker.nextSibling);
    }
  };
  sync();
  mq.addEventListener?.('change', sync);
})();
