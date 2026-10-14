import { test, expect } from '@playwright/test';

test('Coordinates is a static manifesto with all statements visible', async ({ page }) => {
  await page.setViewportSize({ width: 1830, height: 900 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const section = page.locator('#now');
  await expect(section.locator('.coordinate-role')).toHaveText('Research Engineer');
  await expect(section.locator('.coordinate-practice p')).toHaveText([
    'AI Native — Method',
    'Geospatial Engineering — Domain',
    'Open Science — Principle'
  ]);
  await expect(section.locator('.coordinate-static-value h3')).toHaveText([
    'Open', 'Taste', 'Respect', 'Respond'
  ]);
  await expect(section.locator('.coordinate-static-value p')).toHaveText([
    'Share to connect. Open to expand.',
    'Sense to define. Taste to guide.',
    'Stand to equal. Respect to endure.',
    'Act to answer. Build to account.'
  ]);
  await expect(section.locator('button')).toHaveCount(0);
});

test('desktop typography keeps the identity and four statements on one line', async ({ page }) => {
  await page.setViewportSize({ width: 1830, height: 900 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const measured = await page.locator('#now').evaluate(section => {
    const rectCount = el => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getClientRects().length;
    };
    return {
      role: rectCount(section.querySelector('.coordinate-role')),
      statements: [...section.querySelectorAll('.coordinate-static-value p')].map(rectCount)
    };
  });
  expect(measured.role).toBe(1);
  expect(measured.statements).toEqual([1,1,1,1]);
});

test('mobile presents all four statements as a legible vertical sequence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator('#now');
  await expect(section.locator('.coordinate-static-value')).toHaveCount(4);
  const measured = await section.evaluate(node => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    roleLines: (() => {
      const r = document.createRange();
      r.selectNodeContents(node.querySelector('.coordinate-role'));
      return r.getClientRects().length;
    })(),
    boxes: [...node.querySelectorAll('.coordinate-static-value')].map(item => {
      const r = item.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, width: r.width };
    })
  }));
  expect(measured.documentWidth).toBeLessThanOrEqual(measured.viewport + 1);
  expect(measured.roleLines).toBe(1);
  for (let i=1;i<measured.boxes.length;i++) {
    expect(measured.boxes[i].top).toBeGreaterThanOrEqual(measured.boxes[i-1].bottom - 1);
  }
});
