import {test,expect} from '@playwright/test';

test('Light unlocks three continuous optical experiments after the core journey',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Light remains desktop-only');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/lab.html?instrument=light',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({timeout:20000});
  for(const [choice,intervene] of [
    ['BLACK','REMOVE SCATTERING'],
    ['THE SIGNAL COLLAPSES','REMOVE BACKSCATTER'],
    ['NO · WATER SIGNAL REMAINS','REMOVE SURFACE REFLECTION']
  ]){
    await shell.getByRole('button',{name:choice,exact:true}).click();
    await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
    await shell.getByRole('button',{name:intervene,exact:true}).click();
    await shell.getByRole('button',{name:/^(NEXT EXPERIMENT|FINISH TRACE)$/}).click();
  }
  await expect(shell).toHaveAttribute('data-play-state','complete');
  const bonus=shell.getByRole('button',{name:'EXPLORE THREE MORE'});
  await expect(bonus).toBeVisible();
  await bonus.click();
  await expect(shell.locator('.light-journey-chapter')).toHaveText('ACT II / LIGHT IN MOTION');
  await expect(shell.locator('.light-journey-state')).toHaveText('04 OF 06');

  for(const [choice,action,mode,control,max] of [
    ['BLUE LIGHT WEAKENS MOST','LOWER THE SUN','sunset','RELATIVE AIR MASS','8'],
    ['RED LIGHT WEAKENS FASTER','SEND LIGHT 5 M DOWN','depth','WATER PATH LENGTH','8'],
    ['REFLECTION INCREASES','INCREASE INCIDENCE ANGLE','grazing','INCIDENCE FROM NORMAL','85']
  ]){
    await expect(shell).toHaveAttribute('data-light-phenomenon',mode);
    await shell.getByRole('button',{name:choice,exact:true}).click();
    await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
    await expect(shell.locator('.light-explorer')).toHaveCount(0);
    if (mode==='grazing') {
      await expect(shell).toHaveAttribute('data-light-chart','angle');
      await expect(shell.locator('.light-spectrum-x0')).toHaveText('0°');
      await expect(shell.locator('.light-spectrum-xmax')).toHaveText('85°');
      await expect(shell.locator('.light-angle-active-dot')).toBeHidden();
      await expect(shell.locator('.light-spectrum-after')).toHaveCSS('opacity','0');
      await expect(shell.locator('.light-spectrum-after')).toHaveCSS('transition-duration','0s');
    }
    await shell.getByRole('button',{name:action,exact:true}).click();
    const slider=shell.getByRole('slider',{name:control});
    await expect(slider).toBeVisible();
    await expect(shell.locator('.light-spectrum-after')).toHaveCSS('opacity','1');
    if (mode==='sunset') {
      await expect(shell.locator('[data-path="direct"]')).toBeVisible();
      await expect(shell.locator('[data-path="depth"]')).toBeHidden();
    } else if (mode==='depth') {
      await expect(shell.locator('[data-path="direct"]')).toBeHidden();
      await expect(shell.locator('[data-path="depth"]')).toBeVisible();
      await expect(shell.locator('.light-depth-label')).toContainText('5.00 m');
      const sunBox=await shell.locator('.light-sun').boundingBox();
      const metricBox=await shell.locator('.light-mechanism-readout').boundingBox();
      expect(sunBox).toBeTruthy();
      expect(metricBox).toBeTruthy();
      expect(metricBox.x+metricBox.width).toBeLessThan(sunBox.x);
    } else {
      await expect(shell.locator('[data-path="direct"]')).toBeHidden();
      await expect(shell.locator('[data-path="depth"]')).toBeHidden();
      await expect(shell.locator('.light-incidence-guide')).toBeVisible();
      await expect(shell.locator('.light-angle-label')).toContainText('θ 75°');
      await expect(shell.locator('.light-angle-active-dot')).toBeVisible();
      await expect(shell.locator('.light-spectrum')).toHaveAttribute('aria-label',/Fresnel reflectance by incidence angle/);
      await expect(shell.locator('.light-spectrum-probe')).toContainText('θ 40° → 75°');
    }
    const initialArc=mode==='grazing'?await shell.locator('.light-angle-arc').getAttribute('d'):null;
    const initialMarkerX=mode==='grazing'?await shell.locator('.light-angle-active-dot').getAttribute('cx'):null;
    const original=await shell.locator('.light-after-value').innerText();
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveValue(max);
    await expect.poll(()=>shell.locator('.light-after-value').innerText()).not.toBe(original);
    await expect(shell.locator('.light-explore-live')).toContainText(max);
    if (mode==='grazing') {
      await expect(shell.locator('.light-angle-label')).toContainText('θ 85°');
      expect(await shell.locator('.light-angle-arc').getAttribute('d')).not.toBe(initialArc);
      expect(await shell.locator('.light-angle-active-dot').getAttribute('cx')).not.toBe(initialMarkerX);
      await expect(shell.locator('.light-spectrum-probe')).toContainText('θ 40° → 85°');
    }
    if (mode==='depth') await expect(shell.locator('.light-depth-label')).toContainText('8.00 m');
    if (mode==='sunset') {
      const sunBox=await shell.locator('.light-sun').boundingBox();
      const skyBox=await shell.locator('.light-sky').boundingBox();
      expect(sunBox.y+sunBox.height).toBeLessThanOrEqual(skyBox.y+skyBox.height+2);
    }
    await info.attach('advanced-light-'+mode,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
    await shell.getByRole('button',{name:/^(NEXT EXPERIMENT|FINISH TRACE)$/}).click();
  }
  await expect(shell).toHaveAttribute('data-play-state','complete');
  await expect(shell).toContainText('LIGHT MOVES THROUGH MATTER.');
  await shell.getByRole('button',{name:'PLAY AGAIN'}).click();
  await expect(shell.locator('.light-journey-state')).toHaveText('01 OF 03');
  await expect(shell).toHaveAttribute('data-play-state','question');
});
