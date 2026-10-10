// Render the Lab collection into the first HTML response. Use the same authored
// archive and Lab preinit data transforms that the browser uses; do not maintain
// a separate hand-edited set of card descriptions.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const OBSERVATORY = ['l04', 'l05', 'l06', 'l10', 'l11', 'l12', 'l13'];
const PLAY = ['l07', 'l08', 'l09', 'l14', 'l15', 'l16'];
const GROUPS = [
  ['observatory', 'OBSERVATORY',
    'Observe changing systems and representations through declared sources, models, projections, time windows, and spatial extents.', OBSERVATORY],
  ['play', 'PLAY / SPATIAL REASONING',
    'Practice location, boundary, adjacency, and path reasoning through direct geographic feedback.', PLAY]
];
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function labModel(dist) {
  const context = {
    window: {},
    document: { getElementById: () => null, addEventListener: () => {} }
  };
  vm.createContext(context);
  for (const file of ['content.js', 'lab-copy-preinit.js']) {
    vm.runInContext(await fs.readFile(path.join(dist, file), 'utf8'), context, {
      filename: file, timeout: 1500
    });
  }
  const model = context.window.GEOGEEK_DATA?.en;
  if (!Array.isArray(model?.lab) || !model?.ui?.lab) {
    throw new Error('Lab first-paint: authored content or Lab preinit is missing.');
  }
  // lab-page.js applies these existing Flow-specific copy refinements in the
  // browser. Reflect them here to avoid swapping visible first-paint text.
  const flow = model.lab.find(item => item.id === 'l06');
  if (flow) Object.assign(flow, {
    status: 'Instrument',
    title: 'Geographic Flow Laboratory',
    tags: ['Movement', 'Flow', 'Trajectory'],
    description: 'One workbench compares continuous vector fields, aggregate origin–destination networks, timestamped trajectories, and Lagrangian releases without pretending they are the same geometry.',
    coord: 'field / OD / x(t)'
  });
  if (model.ui.lab.conditions) {
    model.ui.lab.conditions.flow = [
      ['INPUT', 'Vector field · OD · timestamped paths'],
      ['GEOMETRY', 'Field · network · trajectory · particles'],
      ['TIME', 'Snapshot · aggregate · sequence'],
      ['LIMIT', 'Representation ≠ phenomenon']
    ];
  }
  return model;
}

function missingPreviewMarkup(title) {
  return '<div class="lab-preview-unavailable" role="img" aria-label="' +
    esc(title) + ' preview unavailable">' +
    '<span class="lab-preview-unavailable-grid" aria-hidden="true"></span>' +
    '<span class="lab-preview-unavailable-label">PREVIEW UNAVAILABLE</span>' +
    '</div>';
}

function renderCard(item, cacheVersion, dist) {
  const kind = String(item.instrument || '');
  if (!kind || !/^[a-z]+$/.test(kind)) {
    throw new Error('Lab first-paint: invalid instrument in ' + item.id);
  }
  const ref = 'lab:' + item.id;
  const detail = 'lab.html?instrument=' + encodeURIComponent(kind) + '#' + item.id;
  const title = item.title || kind;
  const preview = '/assets/lab/previews/' + kind + '.jpg?v=' + cacheVersion;
  const previewDir = path.join(dist, 'assets', 'lab', 'previews');
  const hasJpg = existsSync(path.join(previewDir, kind + '.jpg'));
  const hasWebp = kind === 'orbit' && existsSync(path.join(previewDir, 'orbit.webp'));
  const tags = (item.tags || []).slice(0, 3).join(' · ');
  return [
    '<article class="project-card contour-target is-actionable" data-record-ref="' + esc(ref) +
      '" data-detail-href="' + esc(detail) +
      '" data-local-scale="1 : 2,500" data-local-level="RECORD" id="' + esc(item.id) + '">',
    '<div class="project-visual project-visual-' + esc(kind) +
      (hasJpg ? ' is-real-output" data-real-preview="' : ' is-preview-fallback" data-preview-fallback="') + esc(kind) + '">',
    ...(hasJpg ? [
      ...(hasWebp ? [
        '<picture class="lab-orbit-picture">',
        '<source type="image/webp" srcset="/assets/lab/previews/orbit.webp?v=' + esc(cacheVersion) + '">'
      ] : []),
      '<img src="' + esc(preview) + '" alt="' + esc(title) + ' — real instrument output" loading="lazy" decoding="async">',
      ...(hasWebp ? ['</picture>'] : [])
    ] : [missingPreviewMarkup(title)]),
    '</div>',
    '<div class="project-copy">',
    '<div class="project-meta"><span>' + esc(item.status) + '</span><span>' + esc(tags) + '</span></div>',
    '<h2>' + esc(title) + '</h2>',
    '<p>' + esc(item.description) + '</p>',
    // Conditions are instrument-specific runtime metadata. The existing Lab
    // enhancement inserts them after all instrument modules align their model.
    '<div class="project-foot"><span class="lab-coord">' + esc(item.coord) + '</span>',
    '<div class="project-actions">',
    '<a class="project-cta project-link" data-record-ref="' + esc(ref) +
      '" data-transition-source href="records/lab-' + esc(item.id) +
      '.html" aria-label="Read ' + esc(title) + ' record"><span>READ RECORD</span><b>↗</b></a>',
    '<button class="lab-enter project-cta" type="button" data-instrument="' + esc(kind) +
      '" aria-label="Open ' + esc(title) + ' workspace"><span>OPEN INSTRUMENT</span><b>↗</b></button>',
    '</div></div></div></article>'
  ].join('');
}

export async function staticLabCollection(html, dist, cacheVersion) {
  const model = await labModel(dist);
  const byId = new Map(model.lab.map(item => [item.id, item]));
  const expected = [...OBSERVATORY, ...PLAY];
  for (const id of expected) {
    if (!byId.has(id)) throw new Error('Lab first-paint: missing instrument ' + id);
  }
  const collection = GROUPS.map(([key, label, purpose, ids]) => {
    const cards = ids.map(id => renderCard(byId.get(id), cacheVersion, dist)).join('\n');
    return '<section class="lab-group-block lab-group-' + key +
      '" data-group-key="' + key + '"><div class="lab-group-label"><span>' + label +
      '</span><i></i></div><p class="lab-group-purpose">' + esc(purpose) +
      '</p><div class="project-grid">' + cards + '</div></section>';
  }).join('\n');

  // runtime-stability.mjs has already injected a fallback inside the original
  // collection section. Replace that shell, not an assumed empty section.
  const section = /(<section\b(?=[^>]*\bclass=["'][^"']*\blab-list\b[^"']*["'])(?=[^>]*\bid=["']labList["'])[^>]*>)([\s\S]*?)<\/section>/i;
  const existing = section.exec(html);
  if (!existing || !existing[2].includes('lab-static-fallback')) {
    throw new Error('Lab first-paint: expected Lab fallback collection shell not found.');
  }
  if (html.includes('data-static-lab-collection')) {
    throw new Error('Lab first-paint: duplicate collection injection.');
  }
  const fallback = existing[2].trim().replace(
    '<div class="runtime-fallback lab-static-fallback"',
    '<div hidden aria-hidden="true" class="runtime-fallback lab-static-fallback"'
  );
  // First paint is independent of app.js execution. Preserve the original
  // runtime-fallback marker for static QA, but hide its obsolete copy because
  // the entire 13-card collection now works without JavaScript.
  const opening = existing[1].replace(/>$/, ' data-static-lab-collection="v1">');
  const result = html.replace(section, opening + '\n' + collection + '\n' + fallback + '\n</section>');
  if ((result.match(/class="project-card contour-target is-actionable"/g) || []).length !== 13) {
    throw new Error('Lab first-paint: expected exactly 13 instrument cards.');
  }
  return result;
}
