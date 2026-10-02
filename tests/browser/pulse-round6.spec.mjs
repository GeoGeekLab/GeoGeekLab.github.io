import { test, expect } from '@playwright/test';

function buildPulseFixture() {
  const now = Date.now();
  const generated = now - 4 * 60 * 1000;
  const features = [];
  let id = 0;
  const push = (lon, lat, count, { mag = 3.4, depth = 25, status = 'reviewed' } = {}) => {
    for (let index = 0; index < count; index += 1) {
      features.push({
        type:'Feature',
        id:`round6-${id}`,
        properties:{
          mag:mag + (index % 3) * .1,
          place:`Round 6 event ${id + 1}`,
          time:generated - (id + 1) * 90_000,
          updated:generated - id * 45_000,
          status,
          magType:'mw',
          sig:100 + id,
          felt:null,
          cdi:null,
          mmi:null,
          url:`https://earthquake.usgs.gov/earthquakes/eventpage/round6-${id}`
        },
        geometry:{ type:'Point', coordinates:[lon + (index % 5) * .12, lat + (index % 4) * .12, depth] }
      });
      id += 1;
    }
  };

  // Same raw count in two equal-angle cells. Their spherical areas differ strongly,
  // so area-normalized density must be higher in the 60–70°N cell.
  push(1, 5, 40);
  push(1, 65, 40);

  // Fill the rest of the catalogue across many cells so AUTO selects COUNT GRID.
  for (let group = 0; group < 24; group += 1) {
    const lon = -174 + (group % 12) * 29;
    const lat = -55 + Math.floor(group / 12) * 42 + (group % 3) * 4;
    push(lon, lat, 12, {
      mag:1.4 + (group % 5) * .7,
      depth:group % 3 === 0 ? 25 : group % 3 === 1 ? 140 : 420,
      status:group % 4 === 0 ? 'automatic' : 'reviewed'
    });
  }

  const quakes = { type:'FeatureCollection', metadata:{ generated, count:features.length, api:'round6-fixture' }, features };
  const quakeMeta = {
    schemaVersion:2,
    supplyId:'usgs-earthquakes-day',
    dataset:'usgs-earthquakes-day',
    provider:'USGS Earthquake Hazards Program',
    format:'GeoJSON',
    source:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    delivery:'GeoGeek same-origin snapshot',
    transport:'HTTPS GeoJSON feed → scheduled refresh → Pages snapshot',
    scope:'Global rolling past-24-hour event catalogue shared by all visitors',
    fetchedAt:new Date(now - 60_000).toISOString(),
    recordCount:features.length,
    providerCount:features.length,
    providerGeneratedAt:new Date(generated).toISOString(),
    providerApiVersion:'round6-fixture',
    sha256:'round6-fixture-sha'
  };
  const land = {
    type:'FeatureCollection',
    features:[{ type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-170,-55],[-170,70],[170,70],[170,-55],[-170,-55]]] } }]
  };
  const landMeta = {
    schemaVersion:2,
    supplyId:'natural-earth-land-110m',
    dataset:'natural-earth-land-110m',
    provider:'Natural Earth',
    format:'GeoJSON',
    source:'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json',
    delivery:'GeoGeek same-origin reference',
    version:'Data current 2024-01-24 · pinned GeoJSON revision',
    recordCount:land.features.length,
    sha256:'round6-reference-sha'
  };
  return { quakes, quakeMeta, land, landMeta };
}

async function installPulseFixtures(page) {
  const { quakes, quakeMeta, land, landMeta } = buildPulseFixture();
  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(quakeMeta) }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', route => route.fulfill({ status:200, contentType:'application/geo+json', body:JSON.stringify(quakes) }));
  await page.route('**/data/reference/natural-earth-land-110m.meta.json', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(landMeta) }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson', route => route.fulfill({ status:200, contentType:'application/geo+json', body:JSON.stringify(land) }));
  await page.route('https://earthquake.usgs.gov/**', route => route.abort());
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**', route => route.abort());
}

async function openPulse(page) {
  await installPulseFixtures(page);
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.pulse-observation-lab[data-state="ready"][data-pulse-round6="1"]')).toBeVisible({ timeout:15000 });
}

test('Pulse Round 6 makes the event-to-inference chain explicit and progressive', async ({ page }) => {
  await openPulse(page);
  const lab = page.locator('.pulse-observation-lab[data-pulse-round6="1"]');
  const dialog = page.locator('#instrumentDialog');

  await expect(page.locator('.pulse-inference-chain > div')).toHaveCount(5);
  await expect(page.locator('.pulse-inference-chain')).toContainText('01 · EVENT');
  await expect(page.locator('.pulse-inference-chain')).toContainText('02 · WINDOW');
  await expect(page.locator('.pulse-inference-chain')).toContainText('03 · FILTER');
  await expect(page.locator('.pulse-inference-chain')).toContainText('04 · AGGREGATE');
  await expect(page.locator('.pulse-inference-chain')).toContainText('05 · READ');

  // The fixture exceeds AUTO's threshold, so the statistical object is angular cell counts.
  await expect(lab).toHaveAttribute('data-representation', 'density');
  await expect(page.locator('[data-pulse-object]')).toContainText('ANGULAR CELL COUNTS');
  await expect(page.locator('[data-pulse-boundary]')).toContainText('cell count ≠ area-normalized density / hazard');
  await expect(page.locator('[data-pulse-chain-aggregate]')).toContainText('12° × 10° COUNT');
  await expect(page.locator('[data-pulse-chain-read]')).toContainText('CELL COUNTS');

  // Work keeps full provenance progressive rather than permanently occupying the rail.
  await expect(dialog).toHaveAttribute('data-workspace-mode', 'work');
  await expect(page.locator('.pulse-provenance')).toBeHidden();
  await page.locator('[data-pulse-jump="source"]').click();
  await expect(dialog).toHaveAttribute('data-workspace-mode', 'inspect');
  await expect(page.locator('.pulse-provenance')).toBeVisible();

  // Changing the visible set updates the explicit inference chain.
  await page.locator('.instrument-workspace-modes button[data-workspace-mode="work"]').click();
  await page.locator('#pulseMagnitudeFilter').selectOption('4');
  await expect(page.locator('[data-pulse-chain-filter]')).toContainText('M≥4');

  // Events are a different statistical object, not merely a visual style.
  await page.locator('[data-pulse-representation="events"]').click();
  await expect(lab).toHaveAttribute('data-representation', 'events');
  await expect(page.locator('[data-pulse-object]')).toContainText('EVENT RECORDS');
  await expect(page.locator('[data-pulse-chain-aggregate]')).toHaveText('NONE');
  await expect(page.locator('[data-pulse-chain-read]')).toHaveText('POINT PATTERN');
  await expect(page.locator('[data-pulse-measure="area"]')).toBeDisabled();
});

test('Pulse area normalization changes the geographic measure rather than relabeling raw counts', async ({ page }) => {
  await openPulse(page);
  const lab = page.locator('.pulse-observation-lab[data-pulse-round6="1"]');
  await expect(lab).toHaveAttribute('data-representation', 'density');

  const equatorial = page.locator('.pulse-density-cell[aria-label*="0°N to 10°N"]').filter({ has:page.locator('title') }).first();
  const highLatitude = page.locator('.pulse-density-cell[aria-label*="60°N to 70°N"]').filter({ has:page.locator('title') }).first();
  await expect(equatorial).toBeVisible();
  await expect(highLatitude).toBeVisible();

  const raw = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.pulse-density-cell')];
    const eq = cells.find(cell => cell.getAttribute('aria-label')?.includes('0°N to 10°N'));
    const hi = cells.find(cell => cell.getAttribute('aria-label')?.includes('60°N to 70°N'));
    return {
      eqCount:Number(eq?.dataset.count || 0),
      hiCount:Number(hi?.dataset.count || 0),
      eqAlpha:Number(eq?.style.getPropertyValue('--pulse-density') || 0),
      hiAlpha:Number(hi?.style.getPropertyValue('--pulse-density') || 0)
    };
  });
  expect(raw.eqCount).toBe(40);
  expect(raw.hiCount).toBe(40);
  expect(Math.abs(raw.eqAlpha - raw.hiAlpha)).toBeLessThan(0.001);

  await page.locator('[data-pulse-measure="area"]').click();
  await expect(lab).toHaveAttribute('data-pulse-measure', 'area');
  await expect(page).toHaveURL(/pulseMeasure=area/);
  await expect(page.locator('[data-pulse-object]')).toContainText('AREA-NORMALIZED ANGULAR CELLS');
  await expect(page.locator('[data-pulse-boundary]')).toContainText('spatial density ≠ occurrence rate / hazard');
  await expect(page.locator('[data-pulse-chain-unit]')).toContainText('events per 10⁶ km²');

  const normalized = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.pulse-density-cell')];
    const eq = cells.find(cell => cell.getAttribute('aria-label')?.includes('0°N to 10°N'));
    const hi = cells.find(cell => cell.getAttribute('aria-label')?.includes('60°N to 70°N'));
    const parse = cell => {
      const label = cell?.getAttribute('aria-label') || '';
      const area = Number(label.match(/approximate cell area ([\d,]+) square/)?.[1]?.replaceAll(',', '') || 0);
      const density = Number(label.match(/spatial density ([\d.]+) events/)?.[1] || 0);
      return { area, density, alpha:Number(cell?.style.getPropertyValue('--pulse-density') || 0) };
    };
    return { eq:parse(eq), hi:parse(hi) };
  });
  expect(normalized.hi.area).toBeLessThan(normalized.eq.area * 0.5);
  expect(normalized.hi.density).toBeGreaterThan(normalized.eq.density * 2);
  expect(normalized.hi.alpha).toBeGreaterThan(normalized.eq.alpha);

  await highLatitude.focus();
  await expect(page.locator('[data-pulse-cell-count]')).toContainText('40 events');
  await expect(page.locator('[data-pulse-cell-area]')).toContainText('km²');
  await expect(page.locator('[data-pulse-cell-density]')).toContainText('events / 10⁶ km²');
  await expect(page.locator('[data-pulse-cell-limit]')).toContainText('does not correct catalogue completeness');
});

test('Pulse Round 6 survives same-page close and reopen without duplicate inference UI', async ({ page }) => {
  await openPulse(page);
  await expect(page.locator('.pulse-r6-nav')).toHaveCount(1);
  await expect(page.locator('.pulse-inference-chain')).toHaveCount(1);

  await page.locator('#instrumentClose').click();
  await expect(page.locator('#instrumentDialog')).not.toBeVisible();
  await page.locator('[data-instrument="pulse"]').first().click();

  await expect(page.locator('.pulse-observation-lab[data-state="ready"][data-pulse-round6="1"]')).toBeVisible({ timeout:15000 });
  await expect(page.locator('.pulse-r6-nav')).toHaveCount(1);
  await expect(page.locator('.pulse-r6-summary')).toHaveCount(1);
  await expect(page.locator('.pulse-inference-chain')).toHaveCount(1);
});
