import {test,expect} from '@playwright/test';

const VIEWPORTS=[{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768}];
const PRIMER='geogeek.orient.primer.v1';

async function open(page,seed='orient-desktop-redesign'){
  await page.addInitScript(key=>{
    localStorage.setItem(key,JSON.stringify({version:'orient-primer-1',seen:true}));
    localStorage.removeItem('geogeek.orient.active.v1');
  },PRIMER);
  await page.goto(`/lab.html?flowMode=release&instrument=locate&orientSeed=${seed}#l07`,{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({timeout:20_000});
  await expect(shell).toHaveAttribute('data-play-state','judge',{timeout:10_000});
  return shell;
}

async function capture(page,info,name){
  await info.attach(name,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
}
async function layout(shell){
  const boxes=await shell.evaluate(root=>{
    const box=s=>{const r=root.querySelector(s).getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    return {
      display:getComputedStyle(root).display,
      console:getComputedStyle(root.querySelector('.play-console')).display,
      left:box('.play-task'),actions:box('.play-actions'),
      field:box('.play-field'),map:box('.orient-map'),
      right:box('.play-conditions'),legend:box('.orient-desktop-legend')
    };
  });
  expect(boxes.display).toBe('grid');
  expect(boxes.console).toBe('contents');
  expect(boxes.left.width).toBeGreaterThan(310);
  expect(boxes.right.width).toBeGreaterThanOrEqual(300);
  expect(boxes.field.width).toBeGreaterThan(600);
  expect(boxes.left.right).toBeLessThanOrEqual(boxes.field.left+2);
  expect(boxes.field.right).toBeLessThanOrEqual(boxes.right.left+2);
  expect(boxes.map.left).toBeGreaterThan(boxes.field.left);
  expect(boxes.map.right).toBeLessThan(boxes.field.right);
  expect(boxes.map.top).toBeGreaterThan(boxes.field.top);
  expect(boxes.map.bottom).toBeLessThan(boxes.field.bottom);
  await expect(shell.locator('.orient-desktop-head')).toBeVisible();
  await expect(shell.locator('.orient-desktop-legend')).toBeVisible();
  return boxes;
}

test('ORIENT reference-centered globe and independent task / evidence rails preserve hidden truth at desktop sizes',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','STEP 09 desktop-only geometry and visual coverage');
  for(const size of VIEWPORTS){
    await page.setViewportSize(size);
    const shell=await open(page,`desktop-orient-${size.width}`);
    await layout(shell);
    await expect(shell.locator('.orient-truth')).toHaveCount(0);
    await expect(shell.locator('.orient-target')).toHaveCount(0);
    await expect(shell.locator('.orient-legend-truth')).toBeHidden();
    await expect(shell.locator('.play-conditions')).toContainText('AZIMUTHAL EQUIDISTANT');
    await expect(shell.locator('.play-conditions')).toContainText('REFERENCE');
    await expect(shell.getByRole('button',{name:'COMMIT'})).toBeDisabled();
    await capture(page,info,`orient-judge-${size.width}`);

    const map=shell.locator('.orient-map');
    await map.focus();
    await page.keyboard.press('ArrowRight');
    await expect(shell.getByRole('button',{name:'COMMIT'})).toBeDisabled();
    await page.keyboard.press('2');
    await expect(shell.getByRole('button',{name:'COMMIT'})).toBeEnabled();
    await capture(page,info,`orient-ready-${size.width}`);
    await page.keyboard.press('Enter');
    await expect(shell.locator('.orient-truth')).toHaveCount(1);
    await expect(shell.locator('.orient-target')).toHaveCount(1);
    await expect(shell.locator('.orient-legend-truth')).toBeVisible();
    await expect(shell.locator('.orient-legend-residual')).toBeVisible();
    await expect(shell.locator('.play-readout')).toContainText('DISTANCE');
    await expect(shell.locator('.play-readout')).toContainText('BEARING');
    await expect(shell.locator('.play-readout')).toContainText('CONFIDENCE');
    await expect(shell).not.toContainText('TOTAL SCORE');
    const positions=await shell.evaluate(root=>{
      const area=root.querySelector('.play-field').getBoundingClientRect();
      const reading=root.querySelector('.play-readout').getBoundingClientRect();
      return{areaR:area.right,readingL:reading.left};
    });
    expect(positions.areaR).toBeLessThanOrEqual(positions.readingL+2);
    await capture(page,info,`orient-reveal-${size.width}`);
  }
});

test('ORIENT desktop keeps primer, pointer estimate, focus confidence and next relation usable',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','STEP 09 desktop-only interaction');
  await page.setViewportSize({width:1366,height:768});
  await page.goto('/lab.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(key=>{
    localStorage.removeItem(key);
    localStorage.removeItem('geogeek.orient.active.v1');
    localStorage.removeItem('geogeek.play.trace.v1');
  },PRIMER);
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=orient-desktop-primer#l07',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell.locator('.orient-primer-map')).toBeVisible({timeout:20_000});
  await layout(shell);
  await expect(shell.getByRole('button',{name:'START FIELD →'})).toBeDisabled();
  await capture(page,info,'orient-primer-1366');
  const primer=shell.locator('.orient-primer-map');
  await primer.focus();
  await page.keyboard.press('ArrowRight');
  await expect(shell.getByRole('button',{name:'START FIELD →'})).toBeEnabled();
  await shell.getByRole('button',{name:'START FIELD →'}).click();
  await expect(shell).toHaveAttribute('data-play-state','judge');
  const map=shell.locator('.orient-map');
  const rect=await map.boundingBox();
  expect(rect).toBeTruthy();
  const sx=rect.x+rect.width/2,sy=rect.y+rect.height/2;
  await page.mouse.move(sx,sy);
  await page.mouse.down();
  await page.mouse.move(sx+rect.width*.15,sy-rect.height*.14,{steps:8});
  await page.mouse.up();
  await expect(shell.locator('.orient-judgment-point')).toHaveAttribute('opacity','1');
  await expect(shell.getByRole('button',{name:'COMMIT'})).toBeDisabled();
  await shell.locator('.orient-confidence-option[data-confidence="high"]').click();
  await expect(shell.getByRole('button',{name:'COMMIT'})).toBeEnabled();
  await shell.getByRole('button',{name:'COMMIT'}).click();
  await expect(shell.locator('.play-readout')).toContainText('RESIDUAL');
  await capture(page,info,'orient-pointer-compare-1366');
  await shell.getByRole('button',{name:'NEXT RELATION →'}).click();
  await expect(shell).toHaveAttribute('data-play-state','judge');
  await expect(shell.locator('.orient-truth')).toHaveCount(0);
  await expect(shell.getByRole('button',{name:'COMMIT'})).toBeDisabled();
});

test('ORIENT 5-relation Trace stays a separate evidence report and small-window fallback remains operable',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','STEP 09 desktop-only trace visual coverage');
  await page.setViewportSize({width:1366,height:768});
  const shell=await open(page,'orient-desktop-trace');
  for(let slot=1;slot<=5;slot++){
    const map=shell.locator('svg.orient-map:not(.orient-primer-map)');
    await map.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('3');
    await page.keyboard.press('Enter');
    await expect(shell.locator('.orient-truth')).toHaveCount(1);
    if(slot<5){
      const name=slot===4?'TRY ONE MORE →':'NEXT RELATION →';
      await shell.getByRole('button',{name}).click();
    }
  }
  await shell.getByRole('button',{name:'VIEW TRACE →'}).click();
  await expect(shell).toHaveAttribute('data-play-state','trace');
  await expect(shell.locator('.orient-trace-card')).toHaveCount(5);
  await expect(shell.locator('.orient-desktop-head')).toBeHidden();
  await expect(shell.locator('.orient-trace-hero')).toContainText('Not a score');
  await capture(page,info,'orient-trace-1366');

  await page.setViewportSize({width:920,height:780});
  await shell.getByRole('button',{name:'ANOTHER FIELD'}).click();
  await expect(shell).toHaveAttribute('data-play-state','judge');
  await expect(shell.locator('.orient-desktop-head')).toBeHidden();
  await expect(shell.locator('.orient-map')).toBeVisible();
  await page.setViewportSize({width:1366,height:768});
  await layout(shell);
});
