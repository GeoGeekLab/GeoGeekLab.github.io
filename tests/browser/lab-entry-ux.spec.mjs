import { test, expect } from '@playwright/test';

test.describe('Lab entry hierarchy', () => {
  test('presents a six-record Observatory and four-record Play collection', async ({ page }) => {
    await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#labList .project-card').length === 10);
    await page.waitForFunction(() => document.querySelectorAll('.lab-group-purpose').length === 2);

    const intro = page.locator('.page-title .page-intro');
    await expect(intro).toHaveText('Observe, compare, and reason through space.');

    await expect(page.locator('.lab-instruments-head')).toHaveCount(0);
    await expect(page.getByText('INTERACTIVE INSTRUMENTS', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Observe, compare, and reason through space.', { exact: true })).toHaveCount(1);

    const instrumentsBeforeBuilds = await page.evaluate(() => {
      const instruments = document.querySelector('.lab-instruments');
      const builds = document.querySelector('.lab-builds');
      return Boolean(instruments && builds && (instruments.compareDocumentPosition(builds) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(instrumentsBeforeBuilds).toBe(true);

    const groupOrder = await page.locator('#labList > .lab-group-block').evaluateAll(nodes => nodes.map(node => node.dataset.groupKey));
    expect(groupOrder).toEqual(['observatory', 'play']);

    const observatory = page.locator('#labList > .lab-group-observatory');
    const play = page.locator('#labList > .lab-group-play');
    await expect(observatory.locator('.project-card')).toHaveCount(6);
    await expect(play.locator('.project-card')).toHaveCount(4);
    await expect(observatory.locator('#l11')).toHaveCount(1);
    await expect(observatory.locator('#l12')).toHaveCount(1);

    const observatoryColumns = await observatory.locator('.project-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
    if ((page.viewportSize()?.width || 0) > 980) expect(observatoryColumns).toBe(3);

    const recordLinks = page.locator('#labList .project-link');
    await expect(recordLinks).toHaveCount(10);
    await expect(recordLinks.locator('span')).toHaveText(Array(10).fill('READ RECORD'));
    await expect(page.locator('#l13 .project-link')).toHaveAttribute('href', 'records/lab-l13.html');

    await expect(page.locator('#l10 .lab-enter span')).toHaveText('OPEN INSTRUMENT');
    await expect(page.locator('#l10 .lab-card-conditions > div')).toHaveCount(2);
    const pulseConditionLabels = await page.locator('#l10 .lab-card-conditions dt').allTextContents();
    expect(pulseConditionLabels).toEqual(['SOURCE', 'TIME']);
    await expect(page.locator('#l10 .lab-card-conditions')).toContainText('USGS');

    await expect(page.locator('.lab-principle span')).toHaveText('EXTENT / RESOLUTION / LIMIT');
    await expect(page.locator('.lab-builds-head > span')).toHaveText('OPEN-SOURCE BUILDS');
  });

  test('exposes a working record for Project', async ({ page }) => {
    await page.goto('/records/lab-l13.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#recordTitle')).toHaveText('Project');
    await expect(page.locator('#recordKicker')).toContainText('Play');
    await expect(page.locator('#recordMeta')).toContainText('Natural Earth 1:110m');
    await expect(page.locator('#recordActions .primary')).toHaveAttribute('href', 'lab.html?instrument=project#l13');
  });

  test('explains semantic scale and reveals hash targets', async ({ page }) => {
    await page.goto('/lab.html#l10', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#l10')?.dataset.deepLinkTarget === 'true');

    const scale = page.locator('.scale-ui');
    await expect(scale).toHaveAttribute('aria-describedby', 'scaleExplainer');
    await expect(scale).toHaveAttribute('title', /Semantic information scale/);
    await expect(page.locator('#scaleExplainer')).toContainText('not geographic map scale');

    const target = page.locator('#l10');
    await expect(target).toHaveAttribute('data-deep-link-target', 'true');
    await expect(target).toBeInViewport();
  });
});

test.describe('Lab workspace affordances', () => {
  test('keeps workspace modes concise and preserves Lab identity', async ({ page }) => {
    await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(document.querySelector('.instrument-workspace-modes')));

    await page.evaluate(() => {
      const dialog = document.getElementById('instrumentDialog');
      dialog.dataset.instrumentKind = 'pulse';
      dialog.dataset.instrumentFamily = 'map';
      dialog.dataset.labWorkspace = 'true';
      dialog.showModal();
    });

    await expect(page.locator('#instrumentGroupLabel')).toHaveText('OBSERVATORY');
    const modes = page.locator('.instrument-workspace-modes');
    await expect(modes.locator('[data-workspace-mode="focus"]')).toHaveAttribute('title', 'Visualization only');
    await expect(modes.locator('[data-workspace-mode="work"]')).toHaveAttribute('title', 'Primary controls');
    await expect(modes.locator('[data-workspace-mode="inspect"]')).toHaveAttribute('title', 'Full context + provenance');
    await expect(page.locator('#instrumentDialog')).not.toHaveAttribute('data-mode-help', 'Primary controls');
    await expect(page.locator('#instrumentClose')).toHaveAttribute('aria-keyshortcuts', 'Escape');

    await page.evaluate(() => { document.getElementById('instrumentDialog').dataset.instrumentKind = 'figure'; });
    await expect(page.locator('#instrumentGroupLabel')).toHaveText('OBSERVATORY');

    await page.evaluate(() => { document.getElementById('instrumentDialog').dataset.instrumentKind = 'project'; });
    await expect(page.locator('#instrumentGroupLabel')).toHaveText('PLAY / SPATIAL REASONING');
  });
});
