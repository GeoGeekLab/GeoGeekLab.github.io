import { GeoOrbitalField } from './orbital-engine.js';

const section = document.getElementById('orbital-threshold');
if (section) {
  const canvas = document.getElementById('orbitalThresholdCanvas');
  const stage = section.querySelector('.orbital-stage');
  const status = document.getElementById('orbitalStatus');
  const hover = document.getElementById('orbitalHover');
  const datum = document.getElementById('orbitalDatum');
  const selected = document.getElementById('orbitalSelected');
  const selectedName = document.getElementById('orbitalSelectedName');
  const selectedMeta = document.getElementById('orbitalSelectedMeta');
  const selectedType = document.getElementById('orbitalSelectedType');
  const prompt = document.getElementById('orbitalPrompt');
  const sub = document.getElementById('orbitalSub');
  const explore = document.getElementById('orbitalExplore');
  const orbitLabel = document.getElementById('orbitTraceLabel');
  const groundLabel = document.getElementById('groundTraceLabel');

  let locale = 'en';
  try { locale = localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en'; } catch {}
  const copy = locale === 'zh'
    ? {
        eyebrow: '天行 / 轨道观测场',
        title: '天行有迹，观地有时。',
        sub: '择一星，见其天之迹与地之迹。',
        explore: '入天行之器 ↗',
        live: count => `${count.toLocaleString()} 星目 · 实时`,
        demo: count => `${count} 星目 · 示意场`,
        selected: '所观',
        none: '移鼠择星',
        orbit: '天之迹',
        ground: '地之迹'
      }
    : {
        eyebrow: 'ORBITAL FIELD / EARTH IN VIEW',
        title: 'Every orbit is a moving point of view.',
        sub: 'Select one object to reveal its trace in orbit and on Earth.',
        explore: 'EXPLORE ORBIT ↗',
        live: count => `${count.toLocaleString()} OBJECTS · LIVE`,
        demo: count => `${count} OBJECTS · DEMO FIELD`,
        selected: 'SELECTED',
        none: 'MOVE TO READ THE FIELD',
        orbit: 'TRACE IN ORBIT',
        ground: 'TRACE ON EARTH'
      };

  section.querySelector('.orbital-eyebrow').textContent = copy.eyebrow;
  prompt.textContent = copy.title;
  sub.textContent = copy.sub;
  explore.textContent = copy.explore;
  selected.querySelector('span').textContent = copy.selected;
  selectedName.textContent = copy.none;
  orbitLabel.textContent = copy.orbit;
  groundLabel.textContent = copy.ground;

  const controller = new AbortController();
  const engine = new GeoOrbitalField({
    container: stage,
    canvas,
    mode: 'threshold',
    locale,
    signal: controller.signal,
    maxObjects: 1200,
    onStatus: state => {
      status.textContent = state.live ? copy.live(state.count) : copy.demo(state.count);
      status.classList.toggle('is-live', !!state.live);
    },
    onHover: info => {
      if (!info) {
        hover.hidden = true;
        return;
      }
      hover.hidden = false;
      hover.innerHTML = `<strong>${info.record.OBJECT_NAME || '—'}</strong><span>${info.text}</span><span>${Math.round(info.altKm)} km</span>`;
    },
    onDatum: info => { datum.textContent = info.text; },
    onSelect: info => {
      selected.classList.add('has-selection');
      selectedName.textContent = info.record.OBJECT_NAME || '—';
      selectedMeta.textContent = `${info.text} · ${Math.round(info.altKm)} km`;
      selectedType.textContent = String(info.record.__kind || 'other').toUpperCase();
    }
  });

  engine.init().then(() => {
    stage.classList.add('has-webgl');
    const observer = new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting && entries[0].intersectionRatio > 0.08;
      engine.setActive(visible);
      document.body.classList.toggle('orbital-active', visible);
      const sheet = document.getElementById('sheetIndex');
      if (visible) {
        sheet?.querySelectorAll('[aria-current]').forEach(node => node.removeAttribute('aria-current'));
      } else if (sheet) {
        const links = [...sheet.querySelectorAll('[data-sheet-link]')];
        const center = innerHeight * 0.45;
        let best = null;
        let bestDistance = Infinity;
        links.forEach(link => {
          const target = document.getElementById(link.dataset.sheetLink);
          if (!target) return;
          const rect = target.getBoundingClientRect();
          const distance = rect.top <= center && rect.bottom >= center ? 0 : Math.min(Math.abs(rect.top - center), Math.abs(rect.bottom - center));
          if (distance < bestDistance) { best = link; bestDistance = distance; }
        });
        links.forEach(link => link.removeAttribute('aria-current'));
        best?.setAttribute('aria-current', 'location');
      }
    }, { threshold: [0, .08, .18, .5] });
    observer.observe(section);
  });

  window.addEventListener('pagehide', () => {
    controller.abort();
    engine.destroy();
  }, { once: true });
}
