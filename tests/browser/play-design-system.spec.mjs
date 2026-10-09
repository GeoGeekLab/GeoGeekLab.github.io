import {test, expect} from '@playwright/test';

const desktopOnly = testInfo => testInfo.project.name === 'desktop-chromium';
const viewports = [
  {width: 1920, height: 1080},
  {width: 1440, height: 900},
  {width: 1366, height: 768}
];

async function openInstrument(page, instrument, kind) {
  await page.goto(`/lab.html?instrument=${instrument}`, {waitUntil:'domcontentloaded'});
  const shell=page.locator(`.play-v2-shell[data-play-kind="${kind}"], .play-shell[data-play-kind="${kind}"]`);
  await expect(shell).toBeVisible({timeout:20_000});
  await expect(page.locator('#geo-play-style-play-design-system')).toHaveCount(1);
  await page.waitForFunction(() =>
    [...document.styleSheets].some(sheet=>(sheet.href||'').includes('play-design-system.css'))
  );
  return shell;
}

async function checkTokens(shell) {
  const tokens=await shell.evaluate(node=>{
    const style=getComputedStyle(node);
    const names=['--play-bg','--play-panel','--play-fg','--play-action',
      '--play-reference','--play-focus','--play-radius-control'];
    return Object.fromEntries(names.map(name=>[name,style.getPropertyValue(name).trim()]));
  });
  expect(tokens['--play-bg']).toBe('#0b100e');
  expect(tokens['--play-fg']).toBe('#edece5');
  expect(tokens['--play-action']).toBe('#d8794e');
  expect(tokens['--play-reference']).toBe('#8fb5ac');
  expect(tokens['--play-focus']).toBe('#e9c99a');
  expect(tokens['--play-radius-control']).toBe('8px');
}

test('PLAY shared tokens load for both the V2 and legacy instrument shells',async({page},info)=>{
  test.skip(!desktopOnly(info),'Dedicated desktop visual design contract');
  for(const [instrument,kind] of [['project','project'],['light','light'],['locate','orient']]) {
    const shell=await openInstrument(page,instrument,kind);
    await checkTokens(shell);
  }
});

test('PROJECT desktop typographic hierarchy and keyboard controls remain usable',async({page},info)=>{
  test.skip(!desktopOnly(info),'Dedicated desktop visual design contract');
  for(const viewport of viewports) {
    await page.setViewportSize(viewport);
    const shell=await openInstrument(page,'project','project');
    const panel=shell.locator('.project-v2-panel');
    await expect(panel).toBeVisible();
    const title=panel.locator('h2');
    const titleSize=await title.evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
    expect(titleSize).toBeGreaterThanOrEqual(28);
    expect(titleSize).toBeLessThanOrEqual(40);
    const choice=shell.getByRole('button',{name:'GREENLAND'});
    await choice.focus();
    const focus=await choice.evaluate(node=>({
      style:getComputedStyle(node).outlineStyle,
      width:getComputedStyle(node).outlineWidth,
      color:getComputedStyle(node).outlineColor
    }));
    expect(focus.style).toBe('solid');
    expect(focus.width).toBe('2px');
    expect(focus.color).toBe('rgb(233, 201, 154)');
    await info.attach(`project-design-system-${viewport.width}`,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png'
    });
    await choice.click();
    const action=shell.getByRole('button',{name:'REVEAL AREA'});
    await expect(action).toBeDisabled();
  }
});

test('LIGHT desktop selected, disabled and spectrum annotation states remain readable',async({page},info)=>{
  test.skip(!desktopOnly(info),'Dedicated desktop visual design contract');
  for(const viewport of viewports) {
    await page.setViewportSize(viewport);
    const shell=await openInstrument(page,'light','light');
    await checkTokens(shell);
    await expect(shell.locator('.light-spectrum-probe')).toContainText('550 NM · RELATIVE');
    const commit=shell.getByRole('button',{name:'COMMIT PREDICTION'});
    await expect(commit).toBeDisabled();
    const selected=shell.getByRole('button',{name:'BLACK'});
    await selected.click();
    await expect(selected).toHaveAttribute('aria-pressed','true');
    const active=await selected.evaluate(node=>({
      border:getComputedStyle(node).borderTopColor,
      color:getComputedStyle(node).color
    }));
    expect(active.border).toBe('rgb(143, 181, 172)');
    expect(active.color).toBe('rgb(196, 224, 217)');
    await expect(commit).toBeEnabled();
    await info.attach(`light-design-system-${viewport.width}`,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png'
    });
  }
});
