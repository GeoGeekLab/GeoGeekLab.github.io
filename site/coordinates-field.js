/* GeoGeek / Coordinates — the four values describe relations, never rankings. */
(() => {
  'use strict';
  const root = document.querySelector('#now .coord-atlas');
  if (!root) return;

  const values = {
    open: {
      number: '01', name: 'Open', lead: 'Share to connect. Evolve in open.',
      description: 'Remove friction between ideas, data, and people. Share the method as well as the result so that knowledge can travel.',
      relation: 'OPEN SCIENCE / ETHOS',
      insight: 'Knowledge becomes useful when it can be examined and extended.',
      x: 228, y: 150
    },
    taste: {
      number: '02', name: 'Taste', lead: 'Discern what matters. Choose with care.',
      description: 'Choose what matters. Make careful distinctions between signal and noise, clarity and excess, possibility and purpose.',
      relation: 'AI NATIVE / METHOD',
      insight: 'Tools extend judgment; they do not replace the need for it.',
      x: 532, y: 150
    },
    respect: {
      number: '03', name: 'Respect', lead: 'Meet as equals. Build lasting trust.',
      description: 'Work with people, places, evidence, and uncertainty on equal terms. State limits openly and leave room for other perspectives.',
      relation: 'GEOSPATIAL ENGINEERING / DOMAIN',
      insight: 'Every spatial representation has a reference, a limit, and consequences.',
      x: 228, y: 390
    },
    respond: {
      number: '04', name: 'Respond', lead: 'Answer with action. Own the consequences.',
      description: 'Turn observation into responsible action. Test what we build, accept feedback, and remain accountable for its effects.',
      relation: 'RESEARCH ENGINEER / PRACTICE',
      insight: 'Engineering earns trust by answering for what it changes.',
      x: 532, y: 390
    }
  };
  const ids = Object.keys(values);
  const indexEl = root.querySelector('#coordReadoutIndex');
  const titleEl = root.querySelector('#coordReadoutTitle');
  const leadEl = root.querySelector('#coordReadoutLead');
  const descriptionEl = root.querySelector('#coordReadoutDescription');
  const relationEl = root.querySelector('#coordReadoutRelation');
  const insightEl = root.querySelector('#coordReadoutInsight');
  const trace = root.querySelector('#coordActiveTrace');
  const triggers = [...root.querySelectorAll('[data-coord-value]')];

  function select(id) {
    const value = values[id];
    if (!value) return;
    root.dataset.active = id;
    indexEl.textContent = `${value.number} / ${value.name.toUpperCase()}`;
    titleEl.textContent = value.name;
    leadEl.textContent = value.lead;
    descriptionEl.textContent = value.description;
    relationEl.textContent = value.relation;
    insightEl.textContent = value.insight;
    trace.setAttribute('d', `M 380 270 L ${value.x} ${value.y}`);
    triggers.forEach(button => {
      const active = button.dataset.coordValue === id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  triggers.forEach(button => {
    button.addEventListener('click', () => select(button.dataset.coordValue));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const i = ids.indexOf(button.dataset.coordValue);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 :
        (i + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1) + ids.length) % ids.length;
      select(ids[next]);
      const group = button.closest('.coord-readout-navigation') ? '.coord-readout-navigation' : '.coord-plot';
      root.querySelector(`${group} [data-coord-value="${ids[next]}"]`)?.focus();
    });
  });

  // Procedural contour lines provide an abstract topographic texture, not elevation data.
  const contourGroup = root.querySelector('.coord-contours');
  if (contourGroup) {
    const ns = 'http://www.w3.org/2000/svg';
    const fields = [
      {x: 164,y: 166, rx: 125,ry: 88,angle: -.28},
      {x: 628,y: 368, rx: 142,ry: 110,angle: .18}
    ];
    fields.forEach((field, f) => {
      for (let i = 0; i < 12; i++) {
        const scale = .31 + i * .119;
        const points = [];
        for (let j = 0; j <= 96; j++) {
          const theta = j / 96 * Math.PI * 2;
          const relief = 1 + .074 * Math.sin(5 * theta + f * 1.8) + .037 * Math.cos(9 * theta + i * .32);
          const px = field.rx * scale * relief * Math.cos(theta);
          const py = field.ry * scale * relief * Math.sin(theta);
          points.push(`${(field.x + px * Math.cos(field.angle) - py * Math.sin(field.angle)).toFixed(1)},${(field.y + px * Math.sin(field.angle) + py * Math.cos(field.angle)).toFixed(1)}`);
        }
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M' + points.join('L') + 'Z');
        if (i === 3) path.setAttribute('stroke-opacity', '.24');
        contourGroup.appendChild(path);
      }
    });
  }
  select('open');
})();
