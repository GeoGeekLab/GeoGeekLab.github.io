import {test, expect} from '@playwright/test';

const desktopOnly=info=>info.project.name==='desktop-chromium';
const viewports=[
  {width:1920,height:1080},
  {width:1440,height:900},
  {width:1366,height:768}
];

async function openBound(page) {
  await page.goto('/lab.html?instrument=zone',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="bound"]');
  await expect(shell).toBeVisible({timeout:20_000});
  await expect(shell).toHaveCSS('display','grid');
  await expect(shell).toHaveAttribute('data-play-state','drawing');
  return shell;
}

async function checkWorkspace(shell) {
  const layout=await shell.evaluate(root=>{
    const rect=selector=>{
      const node=root.querySelector(selector);
      if(!node) return null;
      const r=node.getBoundingClientRect();
      return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    const stage=root.querySelector('.bound-v2-stage');
    return {
      task:rect('.play-v2-overlay'),
      scene:rect('.play-v2-viewport'),
      board:rect('.bound-v2-stage'),
      evidence:rect('.play-v2-hud'),
      header:rect('.play-v2-header'),
      grid:getComputedStyle(root).display,
      stageAspect:stage?getComputedStyle(stage).aspectRatio:''
    };
  });
  expect(layout.grid).toBe('grid');
  expect(layout.task.width).toBeGreaterThanOrEqual(289);
  expect(layout.evidence.width).toBeGreaterThanOrEqual(279);
  expect(layout.scene.width).toBeGreaterThan(430);
  expect(layout.task.right).toBeLessThanOrEqual(layout.scene.x+2);
  expect(layout.scene.right).toBeLessThanOrEqual(layout.evidence.x+2);
  expect(layout.board.x).toBeGreaterThanOrEqual(layout.scene.x+8);
  expect(layout.board.right).toBeLessThanOrEqual(layout.scene.right-8);
  expect(layout.board.y).toBeGreaterThanOrEqual(layout.scene.y+18);
  expect(layout.board.bottom).toBeLessThanOrEqual(layout.scene.bottom-18);
  expect(Math.abs(layout.board.width-layout.board.height)).toBeLessThan(3);
  await expect(shell.locator('.bound-v2-evidence-values')).toBeVisible();
  await expect(shell.locator('.bound-v2-evidence-legend')).toBeVisible();
  await expect(shell.locator('.bound-v2-panel')).toBeVisible();
  return layout;
}

async function capture(page,info,name) {
  await info.attach(name,{
    body:await page.screenshot({animations:'disabled'}),
    contentType:'image/png'
  });
}

test('BOUND task, square risk field and numerical evidence stay unobstructed at three desktop sizes',async({page},info)=>{
  test.skip(!desktopOnly(info),'STEP 07 desktop-only visual contract');
  for(const viewport of viewports) {
    await page.setViewportSize(viewport);
    const shell=await openBound(page);
    await checkWorkspace(shell);
    await expect(shell.locator('.bound-v2-hud-item')).toContainText(['FLOOD RISK','96 × 96','RISK ≥ 0.52']);
    await expect(shell.getByRole('button',{name:'COMMIT REGION'})).toBeDisabled();
    await capture(page,info,`bound-drawing-${viewport.width}`);

    await shell.getByRole('button',{name:'GUIDED REGION'}).click();
    await expect(shell).toHaveAttribute('data-play-state','ready');
    await expect(shell.locator('.bound-v2-line')).toHaveAttribute('d',/M/);
    await expect(shell.locator('.bound-v2-evidence-values')).toContainText('COVERAGE');
    await expect(shell.locator('.bound-v2-evidence-values')).toContainText('AREA CLOSED');
    await expect(shell.locator('.bound-v2-evidence-values')).toContainText('TARGET ≥ 70%');
    await expect(shell.locator('.bound-v2-evidence-values')).toContainText('TARGET ≤ 30%');
    await checkWorkspace(shell);
    await capture(page,info,`bound-guided-${viewport.width}`);

    await shell.getByRole('button',{name:'COMMIT REGION'}).click();
    await expect(shell).toHaveAttribute('data-play-state','committed');
    await expect(shell.getByRole('button',{name:'CHANGE OBSERVATION'})).toBeEnabled();
    await shell.getByRole('button',{name:'CHANGE OBSERVATION'}).click();
    await expect(shell).toHaveAttribute('data-play-state','decision',{timeout:4000});
    await expect(shell.locator('.bound-v2-hud-item')).toContainText(['FLOOD RISK','24 × 24','RISK ≥ 0.52']);
    await expect(shell.locator('.bound-v2-evidence-values')).toContainText('CHANGED CLASS');
    await expect(shell.locator('.bound-v2-change')).toHaveClass(/is-visible/);
    await checkWorkspace(shell);
    await capture(page,info,`bound-decision-${viewport.width}`);
  }
});

test('BOUND keeps and redraws the original line with separate visible notation and intact results',async({page},info)=>{
  test.skip(!desktopOnly(info),'STEP 07 desktop-only visual contract');
  await page.setViewportSize({width:1366,height:768});
  const shell=await openBound(page);
  await shell.getByRole('button',{name:'GUIDED REGION'}).click();
  await shell.getByRole('button',{name:'COMMIT REGION'}).click();
  await shell.getByRole('button',{name:'CHANGE OBSERVATION'}).click();
  await expect(shell).toHaveAttribute('data-play-state','decision',{timeout:4000});

  const keep=shell.getByRole('button',{name:'KEEP LINE'});
  const redraw=shell.getByRole('button',{name:'REDRAW'});
  const boxes=await Promise.all([keep.boundingBox(),redraw.boundingBox()]);
  expect(boxes[0].width).toBeGreaterThan(100);
  expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(5);
  await keep.click();
  await expect(shell).toHaveAttribute('data-play-state','result');
  await expect(shell.locator('.bound-v2-result')).toContainText('YOU KEPT THE LINE');
  await capture(page,info,'bound-keep-result-1366');

  await shell.getByRole('button',{name:'PLAY AGAIN'}).click();
  await shell.getByRole('button',{name:'GUIDED REGION'}).click();
  const original=await shell.locator('.bound-v2-line').getAttribute('d');
  await shell.getByRole('button',{name:'COMMIT REGION'}).click();
  await shell.getByRole('button',{name:'CHANGE OBSERVATION'}).click();
  await expect(shell).toHaveAttribute('data-play-state','decision',{timeout:4000});
  await shell.getByRole('button',{name:'REDRAW',exact:true}).click();
  await expect(shell).toHaveAttribute('data-play-state','redrawing');
  await expect(shell.locator('.bound-v2-old-line')).toHaveAttribute('d',original);
  await expect(shell.locator('.bound-v2-line')).toHaveAttribute('d','');
  await expect(shell.locator('.bound-v2-old-line')).toHaveCSS('stroke-dasharray','7px, 7px');

  const hit=shell.locator('.bound-v2-hit');
  await hit.focus();
  await page.keyboard.press('g');
  await expect(shell.getByRole('button',{name:'COMMIT NEW LINE'})).toBeEnabled();
  const guided=await shell.locator('.bound-v2-line').getAttribute('d');
  await hit.focus();
  await page.keyboard.press('ArrowRight');
  const moved=await shell.locator('.bound-v2-line').getAttribute('d');
  expect(moved).not.toBe(guided);
  await capture(page,info,'bound-redrawing-two-lines-1366');
  await checkWorkspace(shell);
  await shell.getByRole('button',{name:'COMMIT NEW LINE'}).click();
  await expect(shell).toHaveAttribute('data-play-state','result');
  await expect(shell.locator('.bound-v2-result')).toContainText('YOU MOVED THE LINE');
  await expect(shell.locator('.bound-v2-evidence-values')).toContainText('COVERAGE');
  await capture(page,info,'bound-redraw-result-1366');
});

test('BOUND pointer polygon and narrow-to-desktop layout preserve usable drawing controls',async({page},info)=>{
  test.skip(!desktopOnly(info),'STEP 07 desktop-only visual contract');
  await page.setViewportSize({width:1366,height:768});
  const shell=await openBound(page);
  const field=shell.locator('.bound-v2-hit');
  const r=await field.boundingBox();
  expect(r).toBeTruthy();
  const points=[[.19,.2],[.57,.2],[.63,.59],[.25,.65],[.19,.2]];
  await page.mouse.move(r.x+points[0][0]*r.width,r.y+points[0][1]*r.height);
  await page.mouse.down();
  for(const [x,y] of points.slice(1)){
    await page.mouse.move(r.x+x*r.width,r.y+y*r.height,{steps:8});
  }
  await page.mouse.up();
  await expect(shell).toHaveAttribute('data-play-state','ready');
  await expect(shell.getByRole('button',{name:'COMMIT REGION'})).toBeEnabled();
  await expect(shell.locator('.bound-v2-line')).toHaveAttribute('d',/M/);
  await capture(page,info,'bound-pointer-drawn-1366');

  await page.setViewportSize({width:920,height:780});
  await expect(shell).toHaveCSS('display','block');
  await expect(shell.locator('.bound-v2-panel .bound-v2-metrics')).toBeVisible();
  await expect(shell.locator('.bound-v2-evidence-values')).toBeHidden();
  await expect(shell.getByRole('button',{name:'COMMIT REGION'})).toBeEnabled();

  await page.setViewportSize({width:1366,height:768});
  await checkWorkspace(shell);
  await expect(shell.locator('.bound-v2-panel .bound-v2-metrics')).toBeHidden();
  await expect(shell.locator('.bound-v2-evidence-values')).toContainText('COVERAGE');
  await shell.getByRole('button',{name:'COMMIT REGION'}).click();
  await expect(shell).toHaveAttribute('data-play-state','committed');
});
