import { test, expect } from '@playwright/test';

async function scaleSnapshot(page, route) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await page.waitForTimeout(450);
  return page.locator('body > .scale-ui').evaluate(node => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const strong = getComputedStyle(node.querySelector(':scope > strong'));
    const level = getComputedStyle(node.querySelector(':scope > em'));
    return {
      directChildOfBody: node.parentElement === document.body,
      structure: Array.from(node.children).map(child => `${child.tagName}.${child.className || ''}`),
      position: style.position,
      display: style.display,
      top: style.top,
      right: style.right,
      bottom: style.bottom,
      left: style.left,
      minWidth: style.minWidth,
      width: style.width,
      padding: style.padding,
      border: style.border,
      backgroundColor: style.backgroundColor,
      opacity: style.opacity,
      cursor: style.cursor,
      gridTemplateColumns: style.gridTemplateColumns,
      columnGap: style.columnGap,
      rowGap: style.rowGap,
      strongFontSize: strong.fontSize,
      strongFontFamily: strong.fontFamily,
      levelFontSize: level.fontSize,
      levelColor: level.color,
      rect: {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100
      }
    };
  });
}

test('Round 4b Atlas uses the same Scale instrument as Lab', async ({ page }) => {
  const lab = await scaleSnapshot(page, '/lab.html');
  const atlas = await scaleSnapshot(page, '/atlas.html');

  expect(lab.directChildOfBody).toBe(true);
  expect(atlas.directChildOfBody).toBe(true);
  expect(atlas.structure).toEqual(lab.structure);

  const comparable = [
    'position', 'display', 'top', 'right', 'bottom', 'left', 'minWidth', 'width',
    'padding', 'border', 'backgroundColor', 'opacity', 'cursor',
    'gridTemplateColumns', 'columnGap', 'rowGap', 'strongFontSize',
    'strongFontFamily', 'levelFontSize', 'levelColor'
  ];
  for (const key of comparable) {
    expect(atlas[key], `Atlas Scale ${key} must match Lab`).toBe(lab[key]);
  }

  expect(Math.abs(atlas.rect.x - lab.rect.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(atlas.rect.y - lab.rect.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(atlas.rect.width - lab.rect.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(atlas.rect.height - lab.rect.height)).toBeLessThanOrEqual(1);
});

test('Round 4b keeps Atlas inspector and key in the reading sidebar', async ({ page }, testInfo) => {
  const response = await page.goto('/atlas.html', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await page.waitForSelector('#atlasStage .atlas-node');

  const sidebar = page.locator('.atlas-workspace > .atlas-sidebar');
  const scale = page.locator('body > .scale-ui');
  const inspector = sidebar.locator(':scope > #atlasTip');
  const key = sidebar.locator(':scope > .atlas-key');

  await expect(sidebar).toHaveCount(1);
  await expect(scale).toHaveCount(1);
  await expect(sidebar.locator(':scope > .scale-ui')).toHaveCount(0);
  await expect(inspector).toHaveCount(1);
  await expect(key).toHaveCount(1);

  if (testInfo.project.name === 'mobile-chromium') {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    return;
  }

  await expect(scale).toBeVisible();
  expect(await scale.evaluate(node => getComputedStyle(node).position)).toBe('fixed');

  const geometry = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    return {
      sidebar: rect('.atlas-sidebar'),
      inspector: rect('.atlas-sidebar > #atlasTip'),
      key: rect('.atlas-sidebar > .atlas-key')
    };
  });

  expect(geometry.inspector.left).toBeGreaterThanOrEqual(geometry.sidebar.left - 1);
  expect(geometry.key.top).toBeGreaterThan(geometry.inspector.top);
  expect(geometry.key.left).toBeGreaterThanOrEqual(geometry.sidebar.left - 1);
  expect(geometry.key.right).toBeLessThanOrEqual(geometry.sidebar.right + 1);
});
