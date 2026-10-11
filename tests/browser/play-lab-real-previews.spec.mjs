import { test, expect } from '@playwright/test';

const PLAY = [
  ['locate', 'Orient'], ['zone', 'Bound'], ['path', 'Connect'],
  ['project', 'Project'], ['light', 'Light'], ['swath', 'Swath']
];

test('all six PLAY Lab cards keep genuine, loaded instrument screenshots after bootstrap', async ({ page }, info) => {
  if (info.project.name === 'desktop-chromium') {
    await page.setViewportSize({ width: 1366, height: 768 });
  }
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });

  // Exercise the actual built HTML: the initial static Lab collection contains
  // 13 generated captures before play-bootstrap.js enhances the five cards.
  const list = page.locator('#labList[data-static-lab-collection="v1"]');
  await expect(list).toBeVisible();
  await expect(list.locator('.project-card')).toHaveCount(13);

  for (const [kind, title] of PLAY) {
    const card = list.locator('.project-card').filter({
      has: page.locator(`[data-instrument="${kind}"]`)
    });
    await expect(card).toHaveCount(1);
    await expect(card.locator('h2')).toHaveText(title);
    const visual = card.locator('.project-visual');
    await expect(visual).toHaveAttribute('data-real-preview', kind);
    await expect(visual).toHaveClass(/is-real-output/);
    await expect(visual.locator('.play-preview-svg')).toHaveCount(0);

    const image = visual.locator('img');
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('src',
      new RegExp(`/assets/lab/previews/${kind}\\.jpg\\?v=capture-[a-f0-9]{12}$`));
    await expect(image).toHaveAttribute('alt', `${title} — real instrument output`);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(img =>
      img.complete && img.naturalWidth >= 480 && img.naturalHeight >= 200
    )).toBe(true);
    await expect(image).toBeVisible();
    expect(await image.evaluate(img => {
      const css = getComputedStyle(img);
      return css.opacity === '1' && css.visibility === 'visible' &&
        css.objectFit === 'cover';
    })).toBe(true);
  }

  if (info.project.name === 'desktop-chromium') {
    await info.attach('six-play-real-preview-cards-1366', {
      body: await page.locator('.lab-group-play .project-grid')
        .screenshot({ animations: 'disabled' }),
      contentType: 'image/png'
    });
  }
});


test('primary navigation across site sections uses the current PLAY Lab release', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const expectedRelease = await page.locator('meta[name="geogeek-lab-release"]')
    .getAttribute('content');
  expect(expectedRelease).toMatch(/^20\d{6}[a-z0-9]+$/i);

  for (const route of ['/index.html', '/field-notes.html', '/atlas.html', '/elsewhere.html']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const href = await page.locator('#primaryNav a[href*="/lab.html"]').first()
      .getAttribute('href');
    expect(new URL(href, 'https://example.invalid').searchParams.get('release'))
      .toBe(expectedRelease);
  }
});


test('OBSERVATORY and PLAY ship genuine, loaded captures for all 13 cards', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const groups = [
    ['observatory', ['orbit','earth','flow','pulse','figure','world','water']],
    ['play', ['locate','zone','path','project','light','swath']]
  ];
  for (const [group, kinds] of groups) {
    const block = page.locator('.lab-group-' + group);
    await expect(block.locator('.project-card')).toHaveCount(kinds.length);
    for (const kind of kinds) {
      const visual = block.locator('.project-visual[data-real-preview="' + kind + '"]');
      await expect(visual).toHaveCount(1);
      await expect(visual.locator('.lab-preview-unavailable')).toHaveCount(0);
      const image = visual.locator('img');
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(node =>
        node.complete && node.naturalWidth >= 480 && node.naturalHeight >= 200
      )).toBe(true);
    }
  }
});

test('Unavailable captured images remain truthful and can be retried', async ({page}) => {
  await page.route('**/assets/lab/previews/water.jpg*', route => route.abort());
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const visual = page.locator('#l13 .project-visual');
  await visual.scrollIntoViewIfNeeded();
  await expect(visual.locator('.lab-preview-retry')).toBeVisible({timeout:15000});
  await expect(visual.locator('.play-preview-svg')).toHaveCount(0);
  await page.unroute('**/assets/lab/previews/water.jpg*');
  await visual.locator('.lab-preview-retry').click();
  await expect(visual).toHaveAttribute('data-real-preview','water');
  await expect.poll(() => visual.locator('img').evaluate(node =>
    node.complete && node.naturalWidth >= 480
  )).toBe(true);
});
