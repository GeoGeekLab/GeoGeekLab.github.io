import { test, expect } from '@playwright/test';
import { coordinateDimensions, coordinateValues } from '../light/coordinates-fixture.mjs';

async function expectValue(section, value) {
  await expect(section.locator('.coord-atlas')).toHaveAttribute('data-active', value.id);
  for (const [id, text] of [
    ['Index', `${value.number} / ${value.name.toUpperCase()}`], ['Title', value.name],
    ['Lead', value.lead], ['Description', value.description],
    ['Relation', value.relation], ['Insight', value.insight],
  ]) await expect(section.locator(`#coordReadout${id}`)).toHaveText(text);
  await expect(section.locator('.coord-readout')).toHaveAttribute('aria-live', 'polite');
  for (const item of coordinateValues) {
    const buttons = section.locator(`button[data-coord-value="${item.id}"]`);
    await expect(buttons).toHaveCount(2);
    for (const button of await buttons.all()) await expect(button).toHaveAttribute('aria-pressed', String(item.id === value.id));
  }
  await expect(section.locator('#coordActiveTrace')).toHaveAttribute('d', `M 380 270 L ${value.x} ${value.y}`);
}

test('Coordinates presents the Research Engineer identity, three dimensions, and an accessible active value', async ({ page }) => {
  await page.setViewportSize({ width: 1830, height: 900 });
  await page.goto('/');
  const section = page.locator('#now');
  await expect(section.locator('.coord-identity-copy h3')).toHaveText('Research Engineer');
  await expect(section.locator('.coord-pillars .coord-pillar-axis')).toHaveText(coordinateDimensions.map(([axis]) => axis));
  await expect(section.locator('.coord-pillars strong')).toHaveText(coordinateDimensions.map(([, label]) => label));
  await expect(section.getByRole('group', { name: 'Select a value', exact: true }).getByRole('button')).toHaveCount(4);
  await expectValue(section, coordinateValues[0]);
});

test('each map node and value button reveals its complete exact authored copy', async ({ page }) => {
  await page.setViewportSize({ width: 1830, height: 900 });
  await page.goto('/');
  const section = page.locator('#now');
  for (const group of ['.coord-plot', '.coord-readout-navigation']) {
    for (const value of coordinateValues) {
      await section.locator(`${group} [data-coord-value="${value.id}"]`).click();
      await expectValue(section, value);
      await expect(section.locator('#coordReadoutDescription')).toBeVisible();
      await expect(section.locator('#coordReadoutInsight')).toBeVisible();
    }
  }
});

test('keyboard navigation selects values and retains focus in each button group', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#now');
  for (const group of ['.coord-readout-navigation', '.coord-plot']) {
    await section.locator(`${group} [data-coord-value="open"]`).focus();
    for (const [key, id] of [['ArrowRight', 'taste'], ['End', 'respond'], ['Home', 'open'], ['ArrowLeft', 'respond']]) {
      await page.keyboard.press(key);
      const value = coordinateValues.find(item => item.id === id);
      await expectValue(section, value);
      await expect(section.locator(`${group} [data-coord-value="${id}"]`)).toBeFocused();
    }
  }
});

test('mobile keeps every value selectable and its active copy readable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const section = page.locator('#now');
  for (const value of coordinateValues) {
    await section.locator(`.coord-readout-navigation [data-coord-value="${value.id}"]`).click();
    await expectValue(section, value);
    const text = section.locator('#coordReadoutDescription');
    await text.scrollIntoViewIfNeeded();
    await expect(text).toBeVisible();
    const measured = await text.evaluate(node => {
      const style = getComputedStyle(node);
      return { width: document.documentElement.scrollWidth, viewport: innerWidth, size: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
    });
    expect(measured.width).toBeLessThanOrEqual(measured.viewport + 1);
    expect(measured.size).toBeGreaterThanOrEqual(16);
    expect(measured.lineHeight).toBeGreaterThanOrEqual(measured.size * 1.4);
  }
});
