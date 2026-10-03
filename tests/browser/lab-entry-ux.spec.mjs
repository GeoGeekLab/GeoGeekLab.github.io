import { test, expect } from '@playwright/test';

test.describe('Lab entry hierarchy', () => {
  test('presents instruments before builds with explicit actions and conditions', async ({ page }) => {
    await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#labList .project-card').length >= 9);
    await page.waitForFunction(() => document.querySelectorAll('.lab-group-purpose').length === 3);

    await expect(page.locator('.page-title .page-intro')).toContainText('Interactive geographic instruments');
    await expect(page.locator('.lab-method-note')).toContainText('scale, assumptions, sources, and limits');
    await expect(page.locator('#labInstrumentsTitle')).toHaveText('Observe, compare, and reason through space.');

    const instrumentsBeforeBuilds = await page.evaluate(() => {
      const instruments = document.querySelector('.lab-instruments');
      const builds = document.querySelector('.lab-builds');
      return Boolean(instruments && builds && (instruments.compareDocumentPosition(builds) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(instrumentsBeforeBuilds).toBe(true);

    const groupOrder = await page.locator('#labList > .lab-group-block').evaluateAll(nodes => nodes.map(node => node.dataset.groupKey));
    expect(groupOrder).toEqual(['observatory', 'studies', 'play']);

    await expect(page.locator('#l10 .project-link span')).toHaveText('READ RECORD');
    await expect(page.locator('#l10 .lab-enter span')).toHaveText('OPEN INSTRUMENT');
    await expect(page.locator('#l10 .lab-card-conditions > div')).toHaveCount(2);
    await expect(page.locator('#l10 .lab-card-conditions')).toContainText('FEED');
    await expect(page.locator('#l10 .lab-card-conditions')).toContainText('WINDOW');

    await expect(page.locator('.lab-principle')).toContainText('what it can see');
    await expect(page.locator('.lab-builds-head > span')).toHaveText('OPEN-SOURCE BUILDS');
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
    await expect(page.locator('[data-workspace-mode="focus"]')).toHaveAttribute('title', 'Visualization only');
    await expect(page.locator('[data-workspace-mode="work"]')).toHaveAttribute('title', 'Primary controls');
    await expect(page.locator('[data-workspace-mode="inspect"]')).toHaveAttribute('title', 'Full context + provenance');
    await expect(page.locator('#instrumentClose')).toHaveAttribute('aria-keyshortcuts', 'Escape');
  });
});
