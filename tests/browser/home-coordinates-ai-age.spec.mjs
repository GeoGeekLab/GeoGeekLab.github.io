import { test, expect } from '@playwright/test';

test('Coordinates identity stays on one line, below the title, away from the scale', async ({ page }) => {
  await page.setViewportSize({ width: 1830, height: 900 });
  await page.goto('/');
  await expect(page.locator('#now .coordinate-self')).toHaveText("I'm a Research Engineer.");
  await page.evaluate(() => document.fonts.ready);

  const geometry = await page.evaluate(() => {
    const heading = document.querySelector('#now h2');
    const identity = document.querySelector('#now .coordinate-self');
    const scale = document.querySelector('.scale-ui');
    const h = heading.getBoundingClientRect();
    const i = identity.getBoundingClientRect();
    const s = scale.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(identity);
    return {
      identityLines: range.getClientRects().length,
      belowHeading: i.top >= h.bottom - 1,
      overlapsScale: i.left < s.right && i.right > s.left && i.top < s.bottom && i.bottom > s.top
    };
  });
  expect(geometry.identityLines).toBe(1);
  expect(geometry.belowHeading).toBe(true);
  expect(geometry.overlapsScale).toBe(false);
});

test('aphorisms use the whole available width before wrapping', async ({ page }) => {
  await page.setViewportSize({ width: 1830, height: 900 });
  await page.goto('/');
  await expect(page.locator('#valueActiveAxiom')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  for (const value of ['open', 'taste', 'respect', 'respond']) {
    await page.locator('[data-value-trigger="' + value + '"]').evaluate(button => button.click());
    const state = await page.locator('#valueActiveAxiom').evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const parts = range.getClientRects();
      const styles = getComputedStyle(element);
      return { lines: parts.length, maxWidth: styles.maxWidth, content: element.textContent };
    });
    expect(state.lines, value + ': ' + state.content).toBe(1);
    expect(state.maxWidth).not.toBe('24ch');
  }
});

test('mobile keeps the identity intact; all four lenses remain selectable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const identityLines = await page.locator('#now .coordinate-self').evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  });
  expect(identityLines).toBe(1);
  for (const name of ['open', 'taste', 'respect', 'respond']) {
    await page.locator('[data-value-trigger="' + name + '"]').evaluate(button => button.click());
    await expect(page.locator('#now .value-workbench')).toHaveAttribute('data-value-state', name);
  }
  const outputLines = await page.locator('#valueActiveOutput').evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  });
  expect(outputLines).toBe(1);
});
