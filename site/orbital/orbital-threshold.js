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
  const source = document.getElementById('orbitalSource');

  const locale = 'en';
  const ui = window.GEOGEEK_DATA?.en?.ui || {};
  const base = ui.orbitalThreshold || {};
  const kindNames = { earth: 'EARTH OBSERVATION', weather: 'WEATHER', navigation: 'NAVIGATION', science: 'SCIENCE', other: 'OTHER' };
  const copy = {
    eyebrow: base.eyebrow || 'ORBITAL FIELD / EARTH IN VIEW',
    title: base.title || 'Every orbit is a moving point of view.',
    sub: base.subtitle || 'Select one object to reveal its trace in orbit and on Earth.',
    explore: base.explore || 'EXPLORE ORBIT ↗',
    live: count => `${count.toLocaleString()} OBJECTS · ACTIVE CATALOG`,
    demo: count => `${count} OBJECTS · DEMO FIELD`,
    selected: base.selected || 'SELECTED',
    none: base.none || 'MOVE TO READ THE FIELD',
    orbit: base.orbit || 'TRACE IN ORBIT',
    ground: base.ground || 'TRACE ON EARTH',
    source: base.source || 'RADIAL SCALE / COMPRESSED · CELESTRAK ACTIVE CATALOG · NATURAL EARTH · SOLAR TERMINATOR / UTC'
  };

  section.querySelector('.orbital-eyebrow').textContent = copy.eyebrow;
  prompt.textContent = copy.title;
  sub.textContent = copy.sub;
  explore.textContent = copy.explore;
  selected.querySelector('span').textContent = copy.selected;
  selectedName.textContent = copy.none;
  orbitLabel.textContent = copy.orbit;
  groundLabel.textContent = copy.ground;
  if (source) source.textContent = copy.source;

  const controller = new AbortController();
  const engine = new GeoOrbitalField({
    container: stage,
    canvas,
    mode: 'threshold',
    locale,
    signal: controller.signal,
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
      selectedMeta.textContent = `${'SUBSATELLITE'} ${info.text} · ${Math.round(info.altKm)} km · ${info.light === 'daylight' ? 'DAYLIGHT' : 'NIGHT'}`;
      selectedType.textContent = kindNames[info.record.__kind || 'other'] || kindNames.other;
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
