import { test, expect } from '@playwright/test';

const records = [
  ['l04', 'Orbital Commons', 'CelesTrak active', 'Orbital Commons source'],
  ['l05', 'Earth in Change', 'MODIS / Terra', 'NASA GIBS'],
  ['l06', 'Geographic Flow Laboratory', 'Open-Meteo', 'Compare movement representations'],
  ['l10', 'Earth Pulse', 'USGS all_day GeoJSON', 'USGS GeoJSON feeds'],
  ['l11', 'Image → Trace', 'Browser raster', 'Test when a raster image begins to behave like a field'],
  ['l12', 'World as Relation', 'Natural Earth 1:110m', 'Natural Earth'],
  ['l13', 'Water as Spectrum', '400–700 nm', 'Follow how water becomes a spectrum'],
  ['l14', 'Project', 'Natural Earth 1:110m', 'Separate the geography from the representation'],
  ['l15', 'Light', 'Normalized Rayleigh', 'Ask which light path makes a visible signal exist']
];

for (const [id, title, condition, bodyMarker] of records) {
  test(`${id} keeps persistent instrument context on the record page`, async ({ page }) => {
    await page.goto(`/records/lab-${id}.html`, { waitUntil:'domcontentloaded' });

    await expect(page.locator('#recordTitle')).toHaveText(title);
    await expect(page.locator('#recordDetailLabel')).toHaveText('INSTRUMENT NOTES');
    await expect(page.locator('#recordMeta')).toContainText(condition);
    await expect(page.locator('.lab-record-detail')).toBeVisible();
    await expect(page.locator('#recordBody')).toContainText(bodyMarker);
    await expect(page.locator('.lab-record-facts').first()).toBeVisible();
  });
}
