/* GeoGeek UX v4 — production behavior refinements. */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const getLocale = () => {
    try {
      const fromUrl = new URLSearchParams(location.search).get('lang');
      if (fromUrl === 'zh' || fromUrl === 'en') return fromUrl;
      return localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en';
    } catch { return 'en'; }
  };
  let locale = getLocale();
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
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
  if (archiveLocales?.zh?.ui) {
    archiveLocales.zh.ui.nav && (archiveLocales.zh.ui.nav.map = '索引');
    if (archiveLocales.zh.ui.siteMap) {
      archiveLocales.zh.ui.siteMap.title = '站点索引';
      archiveLocales.zh.ui.siteMap.mode = '站点拓扑 / 索引';
      archiveLocales.zh.ui.siteMap.hint = '选择节点以改变位置或信息尺度。';
    }
  }

  const renameIndex = () => {
    locale = getLocale();
    const navToggle = $('#navToggle');
    const toggleLabel = locale === 'zh' ? '索引' : 'Index';
    if (navToggle && navToggle.textContent !== toggleLabel) navToggle.textContent = toggleLabel;
    const map = $('#siteMap');
    if (!map) return;
    const heading = map.querySelector('h2');
    const headingLabel = locale === 'zh' ? '站点索引' : 'SITE INDEX';
    if (heading && /site map|map|站点地图|site index|站点索引/i.test(heading.textContent || '') && heading.textContent !== headingLabel) {
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
  const applyLocalizedUxCopy = lang => {
    const zh = lang === 'zh';
    const copy = [
      ['#selectedWorkKicker', zh ? '精选 / 地记' : 'SELECTED / FIELD NOTES'],
      ['#selectedWorkTitle', zh ? '先看三条真实记录。' : 'Recent records from the archive.'],
      ['#selectedWorkAll', zh ? '打开地记 ↗' : 'OPEN FIELD NOTES ↗'],
      ['#orbitalAssist', zh ? '键盘 · 聚焦轨道场并按回车打开轨道仪器' : 'KEYBOARD · FOCUS THE FIELD AND PRESS ENTER TO OPEN THE ORBIT INSTRUMENT']
    ];
    for (const [selector, text] of copy) {
      const node = $(selector);
      if (node && node.textContent !== text) node.textContent = text;
    }
  };
  applyLocalizedUxCopy(locale);

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

  // Preserve language in shareable URLs while leaving the site's own locale renderer in charge.
  const bindLanguageControl = button => {
    if (!button || button.dataset.uxV4LangBound) return;
    button.dataset.uxV4LangBound = '1';
    button.addEventListener('click', () => {
      const next = getLocale() === 'zh' ? 'en' : 'zh';
      locale = next;
      applyLocalizedUxCopy(next);
      try {
        localStorage.setItem('geogeek-language', next);
        sessionStorage.setItem('geogeek-ux-scroll-y', String(scrollY));
      } catch {}
      const url = new URL(location.href);
      url.searchParams.set('lang', next);
      history.replaceState(history.state, '', url);
    }, { capture: true });
  };
  bindLanguageControl($('#langSwitch'));
  bindLanguageControl($('#mapLangSwitch'));

  // App-rendered UI can appear after initial execution.
  const mutation = new MutationObserver(() => {
    renameIndex();
    bindLanguageControl($('#langSwitch'));
    bindLanguageControl($('#mapLangSwitch'));
  });
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
