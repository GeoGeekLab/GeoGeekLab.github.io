import { test, expect } from '@playwright/test';

test('BOOK 001 keeps BOOK metadata and authored reading response visibly readable in production', async ({ page }) => {
  await page.goto('/records/elsewhere-book-001.html');

  await expect(page.locator('body')).toHaveAttribute('data-static-record', 'true');
  await expect(page.locator('#recordKicker')).toHaveText('BOOK / RECORD');
  await expect(page.locator('#recordDetailLabel')).toHaveText('READING RESPONSE');

  const meta = page.locator('#recordMeta');
  await expect(meta).toContainText('FIELD');
  await expect(meta).toContainText('READING');
  await expect(meta).toContainText('William Manchester');
  await expect(meta).toContainText('FRAME');

  const detail = page.locator('#detail');
  await expect(detail).toHaveClass(/geo-reveal/);
  await expect.poll(() => detail.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');

  const body = page.locator('#recordBody');
  await expect(body).toContainText('Before reading The Glory and the Dream');
  await expect(body).toContainText('After a society passes through crisis after crisis');

  const english = body.locator('[data-book-lang-button="en"]');
  const chinese = body.locator('[data-book-lang-button="zh"]');
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await chinese.click();
  await expect(chinese).toHaveAttribute('aria-pressed', 'true');

  const chinesePanel = body.locator('[data-book-lang-panel="zh"]');
  await expect(chinesePanel).toContainText('读《光荣与梦想》之前');
  await expect(chinesePanel).toContainText('繁盛从来不是一个所有人同时抵达的季节');
  await expect(chinesePanel).toContainText('昨日的结局也不会照着旧稿再写一次');

  const shiftSection = chinesePanel.locator('.book-record-section').nth(2);
  const labelBox = await shiftSection.locator('.book-record-section-label').boundingBox();
  const paragraphBoxes = await shiftSection.locator(':scope > p').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top };
    }),
  );
  const leftEdges = paragraphBoxes.map((box) => box.left);
  const topEdges = paragraphBoxes.map((box) => box.top);
  expect(labelBox).not.toBeNull();

  const viewportWidth = page.viewportSize()?.width ?? 1280;
  if (viewportWidth <= 600) {
    const labelBottom = labelBox.y + labelBox.height;
    expect(Math.min(...topEdges)).toBeGreaterThanOrEqual(labelBottom);
    expect(Math.abs(Math.min(...leftEdges) - labelBox.x)).toBeLessThan(2);
  } else {
    const labelRight = labelBox.x + labelBox.width;
    expect(Math.min(...leftEdges)).toBeGreaterThan(labelRight + 10);
  }
  expect(Math.max(...leftEdges) - Math.min(...leftEdges)).toBeLessThan(2);
});

test('Elsewhere exposes BOOK as a thirty-four-record collection index', async ({ page }) => {
  await page.goto('/elsewhere.html#e02');

  const bookCollection = page.locator('#e02[data-collection-entry="true"]');
  await expect(bookCollection).toBeVisible();
  await expect(bookCollection.locator('.book-unit-head')).toContainText('BOOK INDEX');

  const records = bookCollection.locator('.book-unit-row');
  await expect(records).toHaveCount(34);
  await expect(records.first()).toContainText('The Glory and the Dream');
  await expect(records.first()).toContainText('William Manchester');
  await expect(records.first()).toContainText('1974');
  await expect(records.nth(1)).toContainText('How to Win Friends and Influence People');
  await expect(records.nth(2)).toContainText('To Kill a Mockingbird');
  await expect(records.nth(3)).toContainText('大明王朝1566');
  await expect(records.nth(4)).toContainText('活着');
  await expect(records.nth(5)).toContainText('A Tale of Two Cities');
  await expect(records.nth(6)).toContainText('沧浪之水');
  await expect(records.nth(7)).toContainText('黄金时代');
  await expect(records.nth(8)).toContainText('ノルウェイの森');
  await expect(records.nth(9)).toContainText('南渡北归');
  await expect(records.nth(10)).toContainText('民国三大校长');
  await expect(records.nth(11)).toContainText('Guns, Germs, and Steel');
  await expect(records.nth(12)).toContainText('The Almanack of Naval Ravikant');
  await expect(records.nth(13)).toContainText('ナミヤ雑貨店の奇蹟');
  await expect(records.nth(14)).toContainText('The Evolution of Physics');
  await expect(records.nth(15)).toContainText("Fermat's Enigma");
  await expect(records.nth(16)).toContainText('围城');
  await expect(records.nth(17)).toContainText('乡土中国');
  await expect(records.nth(18)).toContainText('What Life Should Mean to You');
  await expect(records.nth(19)).toContainText('Social Psychology');
  await expect(records.nth(20)).toContainText('Psychologie des foules');
  await expect(records.nth(21)).toContainText('嫌われる勇気');
  await expect(records.nth(22)).toContainText('Il Principe');
  await expect(records.nth(23)).toContainText('随想录');
  await expect(records.nth(24)).toContainText('牛棚杂忆');
  await expect(records.nth(25)).toContainText('目送');
  await expect(records.nth(26)).toContainText('水问');
  await expect(records.nth(27)).toContainText('平凡的世界');
  await expect(records.nth(28)).toContainText('人工智能之不能');
  await expect(records.nth(29)).toContainText('世界的逻辑');
  await expect(records.nth(30)).toContainText('代谢增长论：技术小波和文明兴衰');
  await expect(records.nth(31)).toContainText('八次危机：中国的真实经验1949-2009');
  await expect(records.nth(32)).toContainText('苦难辉煌');
  await expect(records.nth(33)).toContainText('1587, A Year of No Significance');
});

test('BOOK scaffold pages keep metadata while leaving the reading response empty', async ({ page }) => {
  await page.goto('/records/elsewhere-book-002.html');

  await expect(page.locator('#recordTitle')).toHaveText('How to Win Friends and Influence People');
  await expect(page.locator('#recordMeta')).toContainText('Dale Carnegie');
  await expect(page.locator('#recordMeta')).toContainText('1936');
  await expect(page.locator('#recordBody')).toBeEmpty();
});
