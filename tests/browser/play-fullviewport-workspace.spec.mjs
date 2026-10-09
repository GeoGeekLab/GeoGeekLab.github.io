import {test, expect} from '@playwright/test';

const cases = [
  ['locate', 'orient'],
  ['zone', 'bound'],
  ['path', 'connect'],
  ['project', 'project'],
  ['light', 'light'],
  ['swath', 'swath']
];
const desktopSizes = [
  {width: 1920, height: 1080},
  {width: 1440, height: 900},
  {width: 1366, height: 768},
  {width: 1536, height: 864} // CSS viewport equivalent to 1920x1080 at 125% zoom
];

function requireDesktop(info) {
  test.skip(info.project.name !== 'desktop-chromium', 'PLAY desktop workspace contract');
}

async function openPlay(page, instrument, kind) {
  if (kind === 'orient') {
    await page.addInitScript(() => {
      localStorage.setItem('geogeek.orient.primer.v1',
        JSON.stringify({version:'orient-primer-1', seen:true}));
    });
  }
  await page.goto(`/lab.html?instrument=${instrument}`, {waitUntil:'domcontentloaded'});
  const dialog = page.locator('#instrumentDialog');
  await expect(dialog).toHaveAttribute('open', '', {timeout:20_000});
  const shell = page.locator(
    `.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`
  );
  await expect(shell).toBeVisible({timeout:20_000});
  await expect(dialog).toHaveAttribute('data-play-workspace','true');
  await expect(dialog).toHaveAttribute('data-lab-workspace','false');
  return {dialog, shell};
}

async function expectViewport(page, dialog, shell, size) {
  const dimensions = await page.evaluate(() => {
    const dialog = document.getElementById('instrumentDialog');
    const stage = document.getElementById('instrumentStage');
    const shell = stage.querySelector('.play-v2-shell, .play-shell');
    const rect = node => {
      const {x,y,width,height} = node.getBoundingClientRect();
      return {x,y,width,height};
    };
    return {
      viewport:{width:innerWidth,height:innerHeight},
      dialog:rect(dialog),
      stage:rect(stage),
      shell:rect(shell),
      radius:getComputedStyle(dialog).borderTopLeftRadius,
      shellRadius:getComputedStyle(shell).borderTopLeftRadius,
      overflow:getComputedStyle(dialog).overflow,
      cssWidth:getComputedStyle(dialog).width,
      cssHeight:getComputedStyle(dialog).height,
      cssMaxWidth:getComputedStyle(dialog).maxWidth,
      cssMaxHeight:getComputedStyle(dialog).maxHeight,
      viewportStylesheet:[...document.styleSheets].some(sheet=>(sheet.href||'').includes('play-workspace.css')),
      docScroll:document.documentElement.scrollHeight
    };
  });
  expect(dimensions.viewport.width).toBe(size.width);
  expect(dimensions.viewport.height).toBe(size.height);
  expect(Math.abs(dimensions.dialog.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.dialog.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(dimensions.dialog.width-size.width)).toBeLessThanOrEqual(2); // See computed-size diagnostics below
  expect(Math.abs(dimensions.dialog.height-size.height)).toBeLessThanOrEqual(2); // See computed-size diagnostics below
  expect(dimensions.viewportStylesheet).toBe(true);
  expect(dimensions.cssMaxWidth).toBe('none');
  expect(dimensions.cssMaxHeight).toBe('none');
  expect(dimensions.radius).toBe('0px');
  expect(dimensions.shellRadius).toBe('0px');
  expect(dimensions.overflow).toBe('hidden');
  expect(dimensions.stage.height).toBeGreaterThan(400);
  expect(Math.abs(dimensions.shell.height-dimensions.stage.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(dimensions.shell.width-dimensions.stage.width)).toBeLessThanOrEqual(2);
  await expect(dialog.locator('.instrument-meta')).toBeVisible();
  await expect(dialog.locator('.instrument-foot')).toBeVisible();
  await expect(dialog.locator('#instrumentClose')).toBeVisible();
  await expect(shell).toBeVisible();
}

for (const [instrument,kind] of cases) {
  test(`PLAY ${kind} fills desktop viewports without a floating dialog`,async({page},info)=>{
    requireDesktop(info);
    for(const size of desktopSizes) {
      await page.setViewportSize(size);
      const {dialog,shell}=await openPlay(page,instrument,kind);
      await expectViewport(page,dialog,shell,size);
      if (size.width === 1920 || size.width === 1366) {
        await info.attach(`play-${kind}-workspace-${size.width}`,{
          body:await page.screenshot({animations:'disabled'}),
          contentType:'image/png'
        });
      }
    }
  });
}

test('PLAY Close and Escape return to Lab without leaking workspace identity',async({page},info)=>{
  requireDesktop(info);
  await page.setViewportSize({width:1440,height:900});
  const first=await openPlay(page,'project','project');
  const close=first.dialog.locator('#instrumentClose');
  await close.focus();
  await expect(close).toBeFocused();
  await close.click();
  await expect(first.dialog).not.toHaveAttribute('open','');
  await expect(first.dialog).not.toHaveAttribute('data-play-workspace',/true/);

  const second=await openPlay(page,'light','light');
  await page.keyboard.press('Escape');
  await expect(second.dialog).not.toHaveAttribute('open','');
  await expect(second.dialog).not.toHaveAttribute('data-play-workspace',/true/);
});

test('PLAY workspace attributes never apply to World, Water or an ordinary Lab page',async({page},info)=>{
  requireDesktop(info);
  await page.goto('/lab.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#instrumentDialog')).not.toHaveAttribute('data-play-workspace',/true/);
  await page.waitForFunction(() => Boolean(document.querySelector('link[data-lab-fullpage]')?.sheet));
  await page.evaluate(() => {
    document.getElementById('instrumentStage').innerHTML =
      '<div class="world-layout"><div class="world-map-wrap"></div><aside class="world-panel"></aside></div>';
  });
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toHaveAttribute('data-instrument-kind','world');
  await expect(dialog).toHaveAttribute('data-lab-workspace','true');
  await expect(dialog).not.toHaveAttribute('data-play-workspace',/true/);
  await page.evaluate(() => {
    const node=document.getElementById('instrumentDialog');
    node.showModal();
    document.body.classList.add('instrument-open');
  });
  const box=await dialog.boundingBox();
  expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.width-page.viewportSize().width)).toBeLessThanOrEqual(2);
  await page.locator('#instrumentClose').click();
  await expect(dialog).not.toHaveAttribute('open','');
  await expect(dialog).not.toHaveAttribute('data-play-workspace',/true/);
});
